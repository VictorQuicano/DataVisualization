import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

function formatTime(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)} s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins} min ${secs} s` : `${mins} min`;
  } else {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hrs} h ${mins} min` : `${hrs} h`;
  }
}

export default function Treemap({ data }) {
  const svgRef = useRef(null);
  // Create our treemap visualization
  const [width, setWidth] = useState(window.innerWidth - 20);
  const [height, setHeight] = useState(window.innerHeight - 20);

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth - 20);
      setHeight(window.innerHeight - 20);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup on unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    let group;

    // This custom tiling function adapts the built-in binary tiling function
    // for the appropriate aspect ratio when the treemap is zoomed-in.
    function tile(node, x0, y0, x1, y1) {
      d3.treemapBinary(node, 0, 0, width, height);
      for (const child of node.children) {
        child.x0 = x0 + (child.x0 / width) * (x1 - x0);
        child.x1 = x0 + (child.x1 / width) * (x1 - x0);
        child.y0 = y0 + (child.y0 / height) * (y1 - y0);
        child.y1 = y0 + (child.y1 / height) * (y1 - y0);
      }
    }

    // Compute the layout.
    const hierarchy = d3
      .hierarchy(data)
      .sum((d) => d.value)
      .sort((a, b) => b.value - a.value);
    const root = d3.treemap().tile(tile)(hierarchy);

    // Create the scales.
    const x = d3.scaleLinear().rangeRound([0, width]);
    const y = d3.scaleLinear().rangeRound([0, height]);

    // Formatting utilities.
    const format = formatTime;
    const getName = (d) =>
      d
        .ancestors()
        .reverse()
        .map((d) => d.data.name)
        .join(" / ");

    // Create the SVG container.
    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", [0.5, -60.5, width, height + 60])
      .attr("width", width)
      .attr("height", height + 60)
      .attr("style", "max-width: 100%; height: auto;")
      .style("font", "10px sans-serif");

    // Display the root.
    group = svg.append("g").call(render, root);

    function render(group, root) {
      const usedPatterns = new Set();

      const node = group
        .selectAll("g")
        .data(root.children ? root.children.concat(root) : [root])
        .join("g");

      node
        .filter((d) => (d === root ? d.parent : d.children))
        .attr("cursor", "pointer")
        .on("click", (event, d) => (d === root ? zoomout(root) : zoomin(d)));

      node.append("title").text((d) => `${getName(d)}\n${format(d.value)}`);

      node
        .append("rect")
        .attr("id", (d) => {
          d.leafUid = `leaf-${
            d.id || Math.random().toString(36).substring(2, 9)
          }`;
          return d.leafUid;
        })
        .attr("fill", (d) => {
          if (d.data.thumbnail) {
            const patternCache = new Map();
            const w = d.x1 - d.x0; // ancho en unidades SVG
            const h = d.y1 - d.y0; // alto en unidades SVG

            const patternId = `pattern-${
              d.id || Math.random().toString(36).substring(2, 9)
            }`;

            if (!patternCache.has(patternId)) {
              const pattern = svg
                .append("defs")
                .append("pattern")
                .attr("id", patternId)
                .attr("patternUnits", "userSpaceOnUse")
                .attr("width", w)
                .attr("height", h);

              // Y la imagen interior:
              pattern
                .append("image")
                .attr("xlink:href", d.data.thumbnail)
                .attr("width", w)
                .attr("height", h)
                .attr("preserveAspectRatio", "xMidYMid slice");

              patternCache.set(patternId, true);
            }

            return `url(#${patternId})`;
          }
          return "#ddd";
        })
        .attr("stroke", "#fff");

      node
        .append("clipPath")
        .attr("id", (d) => {
          // Create a unique ID for each clip
          d.clipUid = `clip-${
            d.id || Math.random().toString(36).substring(2, 9)
          }`;
          return d.clipUid;
        })
        .append("use")
        .attr("xlink:href", (d) => `#${d.leafUid}`);

      node
        .append("text")
        .attr("clip-path", (d) => `url(#${d.clipUid})`)
        .attr("font-weight", (d) => (d === root ? "bold" : null))
        .attr("font-size", "2em")
        .selectAll("tspan")
        .data((d) => [d === root ? getName(d) : d.data.name, format(d.value)])
        .join("tspan")
        .attr("x", 3)
        .attr(
          "y",
          (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`
        )
        .attr("fill-opacity", (d, i, nodes) =>
          i === nodes.length - 1 ? 0.7 : null
        )
        .attr("font-weight", (d, i, nodes) =>
          i === nodes.length - 1 ? "normal" : null
        )
        .text((d) => d);

      node.selectAll("text").each(function () {
        const text = d3.select(this);
        const bbox = this.getBBox();

        const padding = { top: 4, right: 2, bottom: 4, left: 2 };

        const rect = d3
          .select(this.parentNode)
          .insert("rect", "text") // inserta antes del text
          .attr("x", bbox.x - padding.left)
          .attr("y", bbox.y - padding.top)
          .attr("width", bbox.width + padding.left + padding.right)
          .attr("height", bbox.height + padding.top + padding.bottom)
          .attr("fill", "white");
      });
      group.call(position, root);

      svg
        .select("defs.patterns")
        .selectAll("pattern")
        .filter((id) => !usedPatterns.has(id))
        .remove();
    }

    function position(group, root) {
      group
        .selectAll("g")
        .attr("transform", (d) =>
          d === root ? `translate(0,-60)` : `translate(${x(d.x0)},${y(d.y0)})`
        )
        .select("rect")
        .attr("width", (d) => (d === root ? width : x(d.x1) - x(d.x0)))
        .attr("height", (d) => (d === root ? 60 : y(d.y1) - y(d.y0)));
    }

    // When zooming in, draw the new nodes on top, and fade them in.
    function zoomin(d) {
      const group0 = group.attr("pointer-events", "none");
      const group1 = (group = svg.append("g").call(render, d));

      x.domain([d.x0, d.x1]);
      y.domain([d.y0, d.y1]);

      svg
        .transition()
        .duration(750)
        .call((t) => group0.transition(t).remove().call(position, d.parent))
        .call((t) =>
          group1
            .transition(t)
            .attrTween("opacity", () => d3.interpolate(0, 1))
            .call(position, d)
        )
        .on("end", () => {
          // Para cada rectángulo con patrón:
          svg.selectAll("rect[fill^='url(#pattern-']").each(function (d) {
            const rect = d3.select(this);
            const pid = rect.attr("fill").match(/url\(#(pattern-[^)]+)\)/)[1];
            const pattern = svg.select(`#${pid}`);

            // recalcula en px el ancho y alto según la nueva escala
            const newW = x(d.x1) - x(d.x0);
            const newH = y(d.y1) - y(d.y0);

            pattern
              .attr("width", newW)
              .attr("height", newH)
              .select("image")
              .attr("width", newW)
              .attr("height", newH);
          });
        });
    }

    // When zooming out, draw the old nodes on top, and fade them out.
    function zoomout(d) {
      const group0 = group.attr("pointer-events", "none");
      const group1 = (group = svg.insert("g", "*").call(render, d.parent));

      x.domain([d.parent.x0, d.parent.x1]);
      y.domain([d.parent.y0, d.parent.y1]);

      svg
        .transition()
        .duration(750)
        .call((t) =>
          group0
            .transition(t)
            .remove()
            .attrTween("opacity", () => d3.interpolate(1, 0))
            .call(position, d)
        )
        .call((t) => group1.transition(t).call(position, d.parent))
        .on("end", () => {
          // Para cada rectángulo con patrón:
          svg.selectAll("rect[fill^='url(#pattern-']").each(function (d) {
            const rect = d3.select(this);
            const pid = rect.attr("fill").match(/url\(#(pattern-[^)]+)\)/)[1];
            const pattern = svg.select(`#${pid}`);

            // recalcula en px el ancho y alto según la nueva escala
            const newW = x(d.x1) - x(d.x0);
            const newH = y(d.y1) - y(d.y0);

            pattern
              .attr("width", newW)
              .attr("height", newH)
              .select("image")
              .attr("width", newW)
              .attr("height", newH);
          });
        });
    }
  }, [data]);

  return (
    <div className="flex flex-col items-center w-full h-screen">
      <div className="w-full overflow-auto">
        <svg ref={svgRef} className="w-full max-w-full"></svg>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        Haz clic en un grupo para hacer zoom. Haz clic en el encabezado para
        volver.
      </p>
    </div>
  );
}
