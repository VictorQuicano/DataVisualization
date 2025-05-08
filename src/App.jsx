import { useState } from "react";
import "./App.css";
import Treemap from "./Graph.jsx";
import data from "./resources/videos-scrap.json";
import sampleData from "./resources/sampleData.json";
import { timeToSeconds } from "../utils/tools.js";

function App() {
  function changeName(name) {
    if (name === "SHORTS") return "00:30";
    if (name === "EN DIRECTO") return "05:00:00";
    else return name;
  }
  let dataS = data;
  dataS = dataS.map((item) => {
    return {
      name: item.fecha,
      children: item.videos.map((video) => {
        return {
          name: video.titulo,
          value: timeToSeconds(changeName(video.duracion)),
          thumbnail: video.thumbnail,
          videoUrl: video.videoUrl,
          canal: video.canal,
        };
      }),
    };
  });

  dataS = {
    name: "root",
    children: dataS,
  };

  return (
    <div className="w-full h-screen flex justify-center items-center bg-gray-100">
      <h1>Testing Yet</h1>
      <Treemap data={dataS} width={1154} height={1154} />
    </div>
  );
}

export default App;
