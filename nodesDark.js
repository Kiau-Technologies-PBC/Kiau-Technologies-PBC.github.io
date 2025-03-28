d3.csv("data/nodes2.0.csv").then(function(data) {
  const width = 1920;
  const height = 1080;

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  const nodeIds = Array.from(new Set(data.flatMap(d => [d.source, d.target])));
  shuffle(nodeIds);
  const nodes = nodeIds.map(id => ({ id: String(id), name: String(id) }));


  const nodeMap = new Map(nodes.map((node, index) => [node.id, index]));

  const links = data.map(d => ({
    source: nodes[nodeMap.get(String(d.source))],
    target: nodes[nodeMap.get(String(d.target))],
    type: d.type
  }));
  //const nodes = Array.from(new Set(data.flatMap(d => [d.source, d.target]))).map(id => ({ id: String(id), name: String(id) }));
  //const links = data.map(d => ({ source: String(d.source), target: String(d.target), type: d.type }));

  console.log("Nodes:", nodes);
  console.log("Links:", links);

  const tooltip = d3.select("#tooltip");
  const root = document.documentElement;
  
  const glowFilter = `<filter id="glow" height="1000%" width="1000%" x="-50%" y="-50%">
  <feGaussianBlur stdDeviation="50.5" result="coloredBlur"/>
  <feMerge>
    <feMergeNode in="coloredBlur"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>`;

  d3.select("svg").append("defs").html(glowFilter);

  const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(550))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

  const specialNode = nodes.find(node => node.id === 'Soil Health Monitoring');
  if (specialNode) {
    specialNode.fx = width / 2;
    specialNode.fy = 200;
  }

  const svg = d3.select("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height)
      .attr("style", "max-width: 100%; height: 100%; font: 18px Roboto Mono; shadow: 15;");


  // Preset colors
  const nodeColor = '#ad9280w'; 
  const linkColor = '#9fb38d'; 
  const textStrokeColor = '#75756f'; // Green outline


  // Per-type markers, as they don't inherit styles.
  svg.append("defs").selectAll("marker")
    .data(['null']) // or any dummy data
    .enter().append("marker")
      .attr("id", 'arrow')
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", -0.5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
    .append("path")
      .attr("fill", linkColor)
      .attr("d", "M0,-5L10,0L0,5");


  const link = svg.append("g")
      .attr("fill", "none")
      .attr("stroke-width", 3)
    .selectAll("path")
    .data(links)
    .enter().append("path")
      .attr("stroke", linkColor)// Apply preset link color'
      .attr("filter", "url(#glow)");
     
      
  const node = svg.append("g")
      .attr("fill", "currentColor")
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
    .selectAll("g")
    .data(nodes)
    .enter().append("g")
      .call(drag(simulation)) // Apply drag behavior here
      .on("mouseover", function(event, d) {
        console.log("Hovered node data: ", d);
        tooltip.transition()
          .duration(200)
          .style("opacity", .9);
        tooltip.html("Node: " + d.name ? d.name : "undefined")
          .style("left", (event.pageX + 5) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", function(event, d) {
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });


  node.append("circle")
      .attr("stroke", "#948266") // Remove white stroke
      .attr("stroke-width", 3)
      .attr("r", 7)
      .attr("fill", nodeColor);  // Preset node color


  // Conditionally append text with hyperlinks for a specific node
  node.each(function(d) {
    if (d.id === 'Soil Health Monitoring') { // specific node id
      d3.select(this).append("a")
        .attr("xlink:href", "about.html") // URL
        .attr("target", "") // Open link in a new tab
      .append("text")
        .attr("x", 8)
        .attr("y", "0.31em")
        .attr("font-size", "25px") // Change font size here
        .attr("fill", "#fffdd0")
        .text(d.id)
      .clone(true).lower() // Add outline to text
        .attr("stroke", textStrokeColor)
        .attr("stroke-width", 3)
        .attr("stroke-linejoin", "round");
    } else {
      d3.select(this).append("a")
        .attr("xlink:href", "example.html")
        .attr("target", "")
      .append("text")
        .attr("x", 8)
        .attr("y", "0.31em")
        .attr("font-size", "20px") // Change font size here
        .attr("fill", "#fffdd0")
        .text(d.id)
      .clone(true).lower() // Add outline to text
        .attr("stroke", textStrokeColor)
        .attr("stroke-width", 3)
        .attr("stroke-linejoin", "round");
    }
  });

  
  simulation.on("tick", () => {
    link.attr("d", linkArc);
    node.attr("transform", d => `translate(${d.x},${d.y})`);
  });


  function linkArc(d) {
    const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
    const numWaves = 90; // Number of waves in the link
    const waveAmplitude = 90; // Amplitude of the waves
    const points = [];

    for (let i = 0; i <= numWaves; i++) {
      const t = i / numWaves;
      const x = (1 - t) * d.source.x + t * d.target.x;
      const y = (1 - t) * d.source.y + t * d.target.y + Math.sin(t * Math.PI * 2) * waveAmplitude;
      points.push([x, y]);
    }

    const path = d3.path();
    path.moveTo(d.source.x, d.source.y);
    points.forEach(point => path.lineTo(point[0], point[1]));
    path.lineTo(d.target.x, d.target.y);
    return path.toString();
  
  }

  function drag(simulation) {
    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = Math.max(0, Math.min(width, d3.event.x));  // Constrain x within [0, width]
        d.fy = Math.max(0, Math.min(height, d3.event.y)); // Constrain y within [0, height]
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;//Math.max(0, Math.min(width, d3.event.x));  // Constrain x within [0, width]
        d.fy = null;//Math.max(0, Math.min(height, d3.event.y)); // Constrain y within [0, height]
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

});
