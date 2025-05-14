import { useState } from "react";
import "./App.css";
import Treemap from "./Graph.jsx";
import data from "../resources/videos-scrap.json";
import { groupVideosByWeek } from "../utils/tools.js";
import ZoomableTreemap from "./ZoomableTree.jsx";
import TreemapChart from "./ZoomableTree.jsx";

function App() {
  let dataS = JSON.stringify(groupVideosByWeek(data), null, 2);
  dataS = JSON.parse(dataS);

  dataS = {
    name: "root",
    children: dataS,
  };

  //console.log("dataS", dataS);
  return (
    <div className="w-full h-screen flex justify-center items-center bg-gray-100">
      <ZoomableTreemap data={dataS} />
    </div>
  );
}

export default App;
