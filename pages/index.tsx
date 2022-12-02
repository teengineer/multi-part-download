import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import SimpleProgressBar from "./component/SimpleProgressBar";
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

  // const progressInstance = (
  //   <simpProgBar simpProgBar progress={progress} />
  // );

  useEffect(() => {
    // login();
    if (fileSize > 0) {
      fileUpload();
    }
  }, [uploadIdd, progress]);

  useEffect(() => {
    login();
  }, []);

  const getFileContext = (e) => {
    resetChunkProperties();
    const _file = e.target.files[0];
    console.log("**********************************", _file);
    setFileSize(_file.size);
    setFileName(_file.name);

    const _totalCount =
      _file.size % chunkSize === 0
        ? _file.size / chunkSize
        : Math.floor(_file.size / chunkSize) + 1; // Total count of chunks will have been upload to finish the file
    setChunkCount(_totalCount);
    console.log("Total Count: ", _totalCount);
    setFileToBeUpload(_file);
    const _fileID = uuidv4() + "." + _file.name.split(".").pop();
    setFileGuid(_fileID);
    console.log("fileNmae", fileName);
    uploadStarted(_file.name);
  };

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const fileUpload = async () => {
    setCounter(counter + 1);
    if (counter <= chunkCount) {
      console.log("start", beginingOfTheChunk, "end", endOfTheChunk);
      var chunk = fileToBeUpload.slice(beginingOfTheChunk, endOfTheChunk);
      console.log("chunk", chunk);
      // var reader = new FileReader();
      // reader.readAsDataURL(chunk);
      // reader.onloadend = function async() {
      //   setBase64(reader.result);
      //   uploadChunk(reader.result);
      // };
      var content = await blobToBase64(chunk);
      console.log("content", content);
      uploadChunk(content);
    }
  };

  const login = async () => {
    try {
      // const response = await axios.post("http://localhost:5000/user/login", {
      const response = await axios.post(
        "https://b3-api.bulutix.com/user/login",
        {
          accountId: "6420340315",
          username: "firdevs@entegreyazilim.com.tr",
          password: "14533541",
        });
      console.log("response", response);
      setToken(response.data.token);
    } catch (err) {
      console.log(err);
    }
  };
  const uploadChunk = async (base64_) => {
    console.log("base64", base64_);
    var sendString = base64_.split(",")[1];
    console.log("sendString", sendString);
    try {
      const response = await axios.post(
        // "http://localhost:5000/multipart/upload",
        "https://b3-api.bulutix.com/multipart/upload",
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
        console.log("data", data);
        console.log("ETags1", ETags);
        var arr = [...ETags]; //copy array by value
        console.log("arr1", arr);
        arr.push({ ETag: data.eTag, PartNumber: data.partNumber });
        setETags(arr);
        console.log("arr2", arr);
        console.log("ETags2", ETags);

        setBeginingOfTheChunk(endOfTheChunk);
        setEndOfTheChunk(endOfTheChunk + chunkSize);
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
    console.log("token", token);
    try {
      axios
        .post(
          // "http://localhost:5000/multipart/initiate",
          "https://b3-api.bulutix.com/multipart/initiate",
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
          console.log(response);
          const data = response.data;
          setUploadId(data.uploadId);
          if (data.isSuccess) {
            setProgress(100);
          }
        });
    } catch (error) {
      console.log(error);
    }
  };

  const uploadCompleted = async (arr_) => {
    console.log("eTags", ETags);
    var formData = new FormData();
    formData.append("fileName", fileGuid);

    const response = await axios.post(
      // "http://localhost:5000/multipart/complete",
      "https://b3-api.bulutix.com/multipart/complete",
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
      setProgress(100);
    }
  };

  const resetChunkProperties = () => {
    setShowProgress(true);
    setProgress(0);
    setCounter(1);
    setBeginingOfTheChunk(0);
    setEndOfTheChunk(chunkSize);
    console.log("endOfTheChunk", chunkSize);
  };
  return (
    <div
      className="justify-content-center align-items-center"
    >
      <div style={{ width: '100%' }}>
        <form action="#" method="post">
          <div className="form-group mt-3">
            <label className="mr-2">Upload File</label>
            <input name="file" type="file" onChange={getFileContext} />
          </div>
        </form>
      </div>
      <div className="" style={{ width: '50%' }}>
        <SimpleProgressBar progress={progress} />
      </div>
    </div>
  );
}
