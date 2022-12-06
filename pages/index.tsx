import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import SimpleProgressBar from "./component/SimpleProgressBar";
import { read } from "fs";
export default function Home() {
  const chunkSize = 5 * 1024 * 1024;
  const [showProgress, setShowProgress] = useState(false);
  const [counter, setCounter] = useState(1);
  const [fileToBeUpload, setFileToBeUpload] = useState(null);
  const [beginingOfTheChunk, setBeginingOfTheChunk] = useState(0);
  const [endOfTheChunk, setEndOfTheChunk] = useState(chunkSize);
  const [progress, setProgress] = useState(0);
  const [fileGuid, setFileGuid] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);
  const [ETags, setETags] = useState([]);
  const [uploadIdd, setUploadId] = useState("");
  const [token, setToken] = useState("");
  const [fileName, setFileName] = useState("");
  // filereader declare global
  // let [reader, setFileReader] = useState(null);

  useEffect(() => {
    if (fileSize > 0) {
      fileUpload();
    }
  }, [uploadIdd, progress]);

  useEffect(() => {
    login();
    // setFileReader(new FileReader());
    // console.log("reader baslatildi");
  }, []);

  const getFileContext = (e) => {
    resetChunkProperties();
    const _file = e.target.files[0];
    setFileSize(_file.size);
    setFileName(_file.name);

    const _totalCount =
      _file.size % chunkSize === 0
        ? _file.size / chunkSize
        : Math.floor(_file.size / chunkSize) + 1; // Total count of chunks will have been upload to finish the file
    setChunkCount(_totalCount);
    console.log(`Bu dosya ${_totalCount} parçaya ayrılmıştır.`);
    setFileToBeUpload(_file);
    const _fileID = uuidv4() + "." + _file.name.split(".").pop();
    setFileGuid(_fileID);
    uploadStarted(_file.name);
  };

  // let reader = new window.FileReader()

  const blobToBase64 = async (blob) =>
    new Promise((resolve, reject) => {
      console.log(`Chunk ${counter} icin reader baslatildi`);
      let reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => resolve(reader.result);

      // memory free
      reader.onloadend = () => {
        console.log("reader iptal edildi");
        // reader = null;
        reader.removeEventListener("loadend", () => { });

        console.log(`Chunk ${counter} icin reader iptal edildi`);
      };
      // reader.onerror = (error) => reject(error);/

      //memory leak
      // reader.onabort = () => reject("aborted");

    });


  const fileUpload = async () => {
    setCounter(counter + 1);
    console.log(`Chunk ${counter} başladı.`);
    if (counter <= chunkCount) {
      var chunk = fileToBeUpload.slice(beginingOfTheChunk, endOfTheChunk);
      var content = await blobToBase64(chunk);
      uploadChunk(content);
    }
  };

  const login = async () => {
    try {
      const response = await axios.post(
        "https://b3-api.bulutix.com/user/login",
        // "http://localhost:5000/user/login",
        {
          accountId: "6420340315",
          username: "firdevs@entegreyazilim.com.tr",
          password: "14533541",
        });
      setToken(response.data.token);
    } catch (err) {
      console.log(err);
    }
  };
  const uploadChunk = async (base64_) => {
    var sendString = base64_.split(",")[1];
    try {
      const response = await axios.post(
        "https://b3-api.bulutix.com/multipart/upload",
        // "http://localhost:5000/multipart/upload",
        {
          AccountId: "6420340315",
          BucketName: "abdullah.example",
          ObjectName: fileName,
          Content: sendString,
          ChunkIndex: counter,
          ChunkMax: chunkCount,
          UploadId: uploadIdd,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = response.data;
      if (data.isSuccess) {
        var arr = [...ETags]; //copy array by value
        arr.push({ ETag: data.eTag, PartNumber: data.partNumber });
        setETags(arr);

        setBeginingOfTheChunk(endOfTheChunk);
        setEndOfTheChunk(endOfTheChunk + chunkSize);
        console.log(`Chunk ${counter} bitti.`);
        if (counter === chunkCount) {
          console.log("Process is complete, counter", counter);

          await uploadCompleted(arr);
        } else {
          var percentage = (counter / chunkCount) * 100;
          setProgress(percentage);
        }
      } else {
        console.log("Error Occurred:", data.errorMessage);
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const uploadStarted = async (fileName_) => {
    try {
      axios
        .post(
          "https://b3-api.bulutix.com/multipart/initiate",
          // "http://localhost:5000/multipart/initiate",
          {
            AccountId: "6420340315",
            BucketName: "abdullah.example",
            ObjectName: fileName_,
            UploadId: "a1b2c3d4e5f6g7h8i9j0",
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then((response) => {
          const data = response.data;
          setUploadId(data.uploadId);
          if (data.isSuccess) {
            console.log("Upload başladı.");
            setProgress(100);
          }
        });
    } catch (error) {
      console.log(error);
    }
  };

  const uploadCompleted = async (arr_) => {
    var formData = new FormData();
    formData.append("fileName", fileGuid);

    const response = await axios.post(
      "https://b3-api.bulutix.com/multipart/complete",
      // "http://localhost:5000/multipart/complete",
      {
        AccountId: "6420340315",
        ObjectName: fileName,
        BucketName: "abdullah.example",
        ETags: arr_,
        UploadId: uploadIdd,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = response.data;
    if (data.isSuccess) {
      //memmory free on browser
      setFileToBeUpload(null);

      console.log("Upload tamamlandı.");
      setProgress(100);

    }
  };

  const resetChunkProperties = () => {
    setShowProgress(true);
    setProgress(0);
    setCounter(1);
    setBeginingOfTheChunk(0);
    setEndOfTheChunk(chunkSize);
  };

  const getFile = async () => {
    try {
      axios
        .post(
          // "http://localhost:5000/bucket/abdullah.example/object/Adan Zye Angular 7 Kursu.rar",
          "https://b3-api.bulutix.com/bucket/abdullah.example/object/Adan Zye Angular 7 Kursu.rar",
          {
            AccountId: "6420340315",
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then((response) => {
          downloadBase64File(response.data.B3Object.Content, response.data.B3Object.ContentType, "Adan Zye Angular 7 Kursu.rar");
        });
    } catch (error) {
      console.log(error);
    }
  };

  function downloadBase64File(base64Data, contentType, filename) {
    const linkSource = `data:${contentType};base64,${base64Data}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = linkSource;
    downloadLink.download = filename;
    downloadLink.click();
  }

  return (
    <div
      className="justify-content-center align-items-center"
    >
      <div style={{ width: '100%' }}>
        <form action="#" method="post">
          <div className="form-group mt-3">``
            <label className="mr-2">Upload File</label>
            <input name="file" type="file" onChange={getFileContext} />
          </div>
        </form>
      </div>
      <div className="" style={{ width: '50%' }}>
        <SimpleProgressBar progress={progress} />
      </div>
      <div className="form-group mt-3">
        <button type="button" className="btn btn-primary" onClick={getFile}>
          İndir
        </button>
      </div>
    </div>
  );
}
