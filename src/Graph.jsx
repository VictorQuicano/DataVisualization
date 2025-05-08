import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

// Puedes cambiar este si prefieres otro algoritmo de layout
const tileMethod = d3.treemapSquarify;

const Treemap = ({ data, width = 1154, height = 1154 }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data) return;

    // Limpia SVG anterior si hay
    d3.select(svgRef.current).selectAll("*").remove();

    // Color scale
    const color = d3.scaleOrdinal(
      data.children.map((d) => d.name),
      d3.schemeTableau10
    );

    // Jerarquía y layout
    const root = d3
      .treemap()
      .tile(tileMethod)
      .size([width, height])
      .padding(1)
      .round(true)(
      d3
        .hierarchy(data)
        .sum((d) => d.value)
        .sort((a, b) => b.value - a.value)
    );

    const format = d3.format(",d");
    const svg = d3.select(svgRef.current);

    const leaf = svg
      .selectAll("g")
      .data(root.leaves())
      .join("g")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    leaf.append("title").text(
      (d) =>
        `${d
          .ancestors()
          .reverse()
          .map((d) => d.data.name)
          .join(".")}\n${format(d.value)}`
    );

    leaf
      .append("rect")
      .attr("fill", (d) => {
        while (d.depth > 1) d = d.parent;
        return color(d.data.name);
      })
      .attr("fill-opacity", 0.6)
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0);

    leaf
      .append("text")
      .attr("clip-path", (d, i) => `url(#clip-${i})`)
      .selectAll("tspan")
      .data((d) =>
        d.data.name.split(/(?=[A-Z][a-z])|\s+/g).concat(format(d.value))
      )
      .join("tspan")
      .attr("x", 3)
      .attr(
        "y",
        (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`
      )
      .attr("fill-opacity", (d, i, nodes) =>
        i === nodes.length - 1 ? 0.7 : null
      )
      .text((d) => d);
  }, [data, width, height]);

  return (
    <div className="flex justify-center items-center h-screen w-full">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ maxWidth: "100%", height: "auto", font: "10px sans-serif" }}
      />
    </div>
  );
};

export default Treemap;
