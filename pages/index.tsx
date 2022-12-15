import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Home() {
  const chunkSize = 6 * 1024 * 1024; // 5MB = 5.242.880
  const [token, setToken] = useState("");

  useEffect(() => {
    login();
  }, []);

  const login = async () => {
    try {
      const response = await axios.post(
        "http://localhost:5000/user/login",
        {
          username: "your_username",
          password: "your_password",
        });
      setToken(response.data.token);
    } catch (err) {
      console.log(err);
    }
  };

  const getFile = async () => {
    try {
      download({
        poolLimit: 10,
      }).then((buffers) => {
        saveAs({ name: "image", buffers });
      });
    } catch (error) {
      console.log(error);
    }
  };

  const download = async ({ poolLimit = 10 }) => {
    const contentLength: any = 52428800; // should dynamically 
    const chunks = typeof chunkSize === "number" ? Math.ceil(contentLength / chunkSize) : 1;
    const results = await asyncPool(
      poolLimit,
      new Array(chunks).keys(),
      (i) => {
        let start = i * chunkSize;
        let end = i + 1 == chunks ? contentLength - 1 : (i + 1) * chunkSize - 1;
        return getBinaryContent(start, end, i);
      }
    );
    const sortedBuffers = results.sort((a, b) => a.index - b.index);
    return concatenate(sortedBuffers);
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

  const getBinaryContent = (start, end, i) => {
    return new Promise((resolve, reject) => {
      try {
        const resp = axios.post(
          "http://localhost:5200/multipart/download",
          {
            BucketName: "bucket-name",
            Key: 'file-name',
            StartRange: start,
            EndRange: end,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ).then((response) => {
          resolve({
            index: i, // file block index
            data: response.data.contentString,
          });
        });
      } catch (err) {
        reject(new Error(err));
      }
    });
  }

  const concatenate = async (base64Array) => {
    //merge base64 part of single images
    const mergedBase64 = base64Array.reduce((acc, cur) => {
      return acc + cur.data;
    }, "");

    return Buffer.from(mergedBase64, 'base64');
  }

  const saveAs = ({ name, buffers }) => {
    const blob = new Blob([buffers], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = name || Math.random();
    a.href = blobUrl;
    a.click();
    URL.revokeObjectURL(blobUrl);
  }
  return (
    <div
      className="justify-content-center align-items-center"
    >
      <div className="form-group mt-3">
        <button type="button" className="btn btn-primary" onClick={getFile}>
          Download
        </button>
      </div>
    </div>
  );
}
