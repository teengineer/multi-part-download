import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import SimpleProgressBar from "./component/SimpleProgressBar";
import { read } from "fs";
import atob from 'atob';
export default function Home() {
  const chunkSize = 5 * 1024 * 1024; // 5MB
  const [token, setToken] = useState("");


  useEffect(() => {
    login();
    // setFileReader(new FileReader());
    // console.log("reader baslatildi");
  }, []);


  const login = async () => {
    try {
      const response = await axios.post(
        // "https://b3-api.bulutix.com/user/login",
        "http://localhost:5000/user/login",
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

  const getFile = async () => {
    try {
      // var url = "https://b3-api.bulutix.com/bucket/abdullah.example/object/1GB.bin";
      var url = "http://localhost:5000/bucket/abdullah.example/object/anasayfa.pdf";
      download({
        url,
        poolLimit: 10,
      }).then((buffers) => {
        console.log("buffers", buffers);
        saveAs({ name: "image", buffers, mime: "image/jpg" });
      });

    } catch (error) {
      console.log(error);
    }
  };

  // get the size of the file to be downloaded 
  const getContentLength = (url) => {
    var res = new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest();
      xhr.open("HEAD", url);
      xhr.send();
      xhr.onload = function () {
        resolve(
          ~~xhr.getResponseHeader("Content-Length")
        );
      };
      xhr.onerror = reject;
    });
    console.log("res", res);
    // return res;
  }

  //fetch the file with concurrency
  async function asyncPool(concurrency, iterable, iteratorFn) {
    const ret = []; // Store all asynchronous tasks
    const executing = new Set(); // Stores executing asynchronous tasks
    for (const item of iterable) {
      // Call the iteratorFn function to create an asynchronous task
      const p = Promise.resolve().then(() => iteratorFn(item, iterable));
      ret.push(p); // save new async task
      executing.add(p); // Save an executing asynchronous task

      const clean = () => executing.delete(p);
      p.then(clean).catch(clean);
      if (executing.size >= concurrency) {
        // Wait for faster task execution to complete 
        await Promise.race(executing);
      }
    }
    return Promise.all(ret);
  }

  const getBinaryContent = (url, start, end, i) => {
    return new Promise((resolve, reject) => {
      try {
        const resp = axios.post(
          "http://localhost:5000/multipart/download",
          {
            AccountId: "6420340315",
            BucketName: "abdullah.example",
            Key: 'test.jpg',
            StartRange: start,
            EndRange: end,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ).then((response) => {
          console.log(`${i}. Response: `, response);
          resolve({
            index: i, // file block index
            buffer: response.data.contentRange,
          });
          // return response.data;
        });
      } catch (err) {
        reject(new Error(err));
      }
    });
  }
  const concatenate = (arrays) => {
    console.log("Birlestiriliyor...");
    console.log("arrays", arrays);
    if (!arrays.length) return null;
    let totalLength = arrays.reduce((acc, value) => acc + value.length, 0);
    let result = new Uint8Array(totalLength);
    let length = 0;
    for (let array of arrays) {
      result.set(array, length);
      length += array.length;
    }
    return arrays;
  }

  const saveAs = ({ name, buffers, mime = "image/jpeg" }) => {
    //array of base64 to blob
    // const byteArrays: any = [];
    // const sliceSize = 512;
    // buffers.forEach((buffer) => {
    //   console.log("buffer", buffer);
    //   const byteCharacters = atob(buffer);

    //   for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    //     const slice = byteCharacters.slice(offset, offset + sliceSize);

    //     const byteNumbers = new Array(slice.length);
    //     for (let i = 0; i < slice.length; i++) {
    //       byteNumbers[i] = slice.charCodeAt(i);
    //     }

    //     const byteArray = new Uint8Array(byteNumbers);
    //     byteArrays.push(byteArray);
    //   }
    // });

    // const blob = new Blob([byteArrays], { type: "image/jpeg" });
    // const blobUrl = URL.createObjectURL(blob);
    // console.log("Indirme basliyor");
    var result = "";
    buffers.forEach((buffer) => {
      result += buffer;
    });

    var file = dataURLtoFile('data:text/plain;base64,' + result, 'hello.jpg');
    console.log("file", file);

    // var blb = 
    // const a = document.createElement("a");
    // a.download = name || Math.random();
    // a.href = blobUrl;
    // a.click();
    // URL.revokeObjectURL(blobUrl);
  }

  const dataURLtoFile = (dataurl, filename) => {

    var arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  }

  const download = async ({ url, poolLimit = 1 }) => {
    // const contentLength: any = await getContentLength(url);
    // const contentLength: any = 10485760000;
    // const contentLength: any = 52428800;
    const contentLength: any = 15882755;
    const chunks = typeof chunkSize === "number" ? Math.ceil(contentLength / chunkSize) : 1;
    const results = await asyncPool(
      poolLimit,
      new Array(chunks).keys(),
      (i) => {
        let start = i * chunkSize;
        let end = i + 1 == chunks ? contentLength - 1 : (i + 1) * chunkSize - 1;
        return getBinaryContent(url, start, end, i);
      }
    );
    const sortedBuffers = results
      // .map((item) => new Uint8Array(item.buffer));
      .map((item) => item.buffer);
    return concatenate(sortedBuffers);
  }
  return (
    <div
      className="justify-content-center align-items-center"
    >
      <div className="form-group mt-3">
        <button type="button" className="btn btn-primary" onClick={getFile}>
          İndir
        </button>
      </div>
    </div>
  );
}
