function getResponsiveSettings() {
  const rootStyles = getComputedStyle(document.documentElement);
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  return {
    linkDistance: parseFloat(rootStyles.getPropertyValue('--link-distance')),
    nodeRadius: parseFloat(rootStyles.getPropertyValue('--node-radius')),
    strokeSize: parseFloat(rootStyles.getPropertyValue('--stroke-width')),
    normalFontSize: rootStyles.getPropertyValue('--font-size-normal').trim(),
    specialFontSize: rootStyles.getPropertyValue('--font-size-special').trim(),
    boundPaddingW: parseFloat(rootStyles.getPropertyValue('--boundries-padding-width')),
    boundPaddingH: parseFloat(rootStyles.getPropertyValue('--boundries-padding-height')),
    waveCount: parseInt(rootStyles.getPropertyValue('--wave-count')),
    waveAmp: parseFloat(rootStyles.getPropertyValue('--wave-amp')),
    width: width,
    height: height,
    centerX: width / 2,
    centerY: height / 2
  };
}

// URL mapping configuration - easily extensible
const urlMap = {
  'Kiau Technologies': 'about.html',
  'Greenhouse Twins': 'climate_battery3D.html',
  'Small-Scale Biochar Reactors': 'smallScaleBiochar.html',
  'Local Plastic Recycling': 'localPlasticRecycling.html',
  'E-Waste Projects': 'e-waste.html',
  'Mycomaterials': 'Mycomaterials.html',
  'Design Thinking': 'designThinking.html'
};

// Get URL for a node - returns default if not found
function getNodeUrl(nodeId) {
  return urlMap[nodeId] || 'example.html';
}

// Special nodes configuration
const specialNodes = ['Soil Health Monitoring', 'Kiau Technologies'];
function isSpecialNode(nodeId) {
  return specialNodes.includes(nodeId);
}


d3.csv("data/nodes2.0.csv").then(function(data) {

  let settings = getResponsiveSettings();
  console.log("Responsive Settings:", settings);

  let width = settings.width;
  let height = settings.height;
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    console.log("mobile mode");
  }

  // Shuffle function for randomizing node order
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Create nodes and links based on the data
  const nodeIds = Array.from(new Set(data.flatMap(d => [d.source, d.target])));
  shuffle(nodeIds);
  const nodes = nodeIds.map(id => ({ id: String(id), name: String(id) }));

  const nodeMap = new Map(nodes.map((node, index) => [node.id, index]));
  const links = data.map(d => ({
    source: nodes[nodeMap.get(String(d.source))],
    target: nodes[nodeMap.get(String(d.target))],
    type: d.type
  }));

  console.log("Nodes:", nodes);
  console.log("Links:", links);

  // Set up the SVG container with resizable options
  const root = document.documentElement;
  const svg = d3.select("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("style", "max-width: 100%; height: auto; font: 18px OCR_A;");

  // Add filter for glow effect
  const defs = svg.append("defs");

  const glowFilter = defs.append("filter")
    .attr("id", "glow")
    .attr("height", "300%")
    .attr("width", "300%")
    .attr("x", "-100%")
    .attr("y", "-100%");

  if (!isMobile) {
    // Only add Gaussian blur if not on mobile
    const blur = glowFilter.append("feGaussianBlur")
      .attr("in", "SourceGraphic")
      .attr("stdDeviation", 5.5)
      .attr("result", "coloredBlur");

    const merge = glowFilter.append("feMerge");
    merge.append("feMergeNode").attr("in", "coloredBlur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");
  }

  // Initialize the simulation with forces
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(settings.linkDistance))
    .force("charge", d3.forceManyBody().strength(isMobile ? -50 : -100))
    .force("center", d3.forceCenter(settings.centerX, settings.centerY))
    .force("collision", d3.forceCollide().radius(settings.nodeRadius * 2.5))
    .force("directional", isMobile ? d3.forceX(settings.centerX).strength(.1) : null)
    .alphaDecay(0.02); // Slower decay for smoother animation
  
  let mouseX = settings.centerX, mouseY = settings.centerY;
  svg.on("mousemove", function() {
    const [x, y] = d3.mouse(this);
    mouseX = x;
    mouseY = y;
  });

  // Special node position for "Kiau Technologies"
  const specialNode = nodes.find(node => node.id === 'Kiau Technologies');
  if (specialNode) {
    specialNode.fx = settings.centerX;
    specialNode.fy = settings.centerY;
  }

  // Window resize handler for dynamic resizing
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      settings = getResponsiveSettings();
      width = settings.width;
      height = settings.height;
      
      // Update SVG viewBox
      svg.attr("viewBox", `0 0 ${width} ${height}`);
      
      // Update forces
      simulation
        .force("center", d3.forceCenter(settings.centerX, settings.centerY))
        .force("link", d3.forceLink(links).id(d => d.id).distance(settings.linkDistance))
        .force("collision", d3.forceCollide().radius(settings.nodeRadius * 2.5))
        .alpha(0.3)
        .restart();
      
      // Update special node position
      if (specialNode) {
        specialNode.fx = settings.centerX;
        specialNode.fy = settings.centerY;
      }
      
      console.log("Resized to:", settings);
    }, 250);
  });

  // Determine day/night mode based on time
  const hour = new Date().getHours();
  const isDayMode = (hour >= 6 && hour < 18);
  const nodeColor = isDayMode ? getComputedStyle(root).getPropertyValue('--node-color-day').trim() : getComputedStyle(root).getPropertyValue('--node-color-night').trim();
  const linkColor = isDayMode ? getComputedStyle(root).getPropertyValue('--link-color-day').trim() : getComputedStyle(root).getPropertyValue('--link-color-night').trim();
  const textStrokeColor = isDayMode ? getComputedStyle(root).getPropertyValue('--text-stroke-color-day').trim() : getComputedStyle(root).getPropertyValue('--text-stroke-color-night').trim();

  // Set up markers for links
  svg.append("defs").selectAll("marker")
    .data(['null']) // dummy data
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

  // Create link paths
  const link = svg.append("g")
    .attr("fill", "none")
    .attr("stroke-width", settings.strokeSize)
    .selectAll("path")
    .data(links)
    .enter().append("path")
    .attr("stroke", linkColor) // Apply preset link color
    .attr("filter", (!isDayMode && !isMobile) ? "url(#glow)" : null); // Disable glow on mobile

  // Create node groups with circles and text
  const node = svg.append("g")
    .attr("fill", "currentColor")
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .selectAll("g")
    .data(nodes)
    .enter().append("g")
    .call(drag(simulation));

    node.append("circle")
    .attr("aria-hidden", "true")
    .attr("stroke", "#c3f8cf")
    .attr("stroke-width", 1.5)
    .attr("r", settings.nodeRadius)
    .attr("fill", nodeColor)
    .attr("role", "img")
    .attr("aria-label", d => `Node: ${d.name}`)
  
    node.each(function(d) {
      const nodeGroup = d3.select(this);
    
      const anchor = nodeGroup.append("a")
        .attr("xlink:href", () => getNodeUrl(d.id))
        .attr("role", "link")
        .attr("tabindex", 0)
        .attr("aria-hidden", "true");
    
      const offsetX = d.x < settings.centerX ? -8 : 8;
      const offsetY = d.y < settings.centerY ? -8 : 8;
      const textAnchor = d.x < settings.centerX ? "end" : "start";
      const dy = d.y < settings.centerY ? "-0.0em" : "0.0em";
    
      const text = anchor.append("text")
        .attr("class", "main-text")
        .attr("filter", (!isDayMode && !isMobile) ? "url(#glow)" : null)
        .attr("x", offsetX)
        .attr("y", offsetY)
        .attr("dy", dy)
        .attr("text-anchor", textAnchor)
        .attr("font-size", isSpecialNode(d.id) ? settings.specialFontSize : settings.normalFontSize)
        .text(d.id);
    
      text.attr("aria-label", d.id);
    
      text.clone(true).lower()
        .attr("class", "text-glow")
        .attr("stroke", textStrokeColor)
        .attr("stroke-width", 5)
        .attr("stroke-linejoin", "round");
    });
    
    
  

  // Update link and node positions during simulation ticks
  simulation.on("tick", () => {
    link.attr("d", linkArc);
    node.attr("transform", d => {
      d.x = Math.max(settings.boundPaddingW, Math.min(width - settings.boundPaddingW, d.x));
      d.y = Math.max(settings.boundPaddingH, Math.min(height - settings.boundPaddingH, d.y));
      return `translate(${d.x},${d.y})`;
    });
  
    node.each(function(d) {
      const anchor = d3.select(this).select("a");
      const currentCenterX = width / 2;
      const currentCenterY = height / 2;
      
      anchor.selectAll("text")
        .transition()
        .duration(50)
        .attr("x", d.x < currentCenterX ? -8 : 8)
        .attr("y", d => d.y < currentCenterY ? -8 : 8)
        .attr("text-anchor", d.x < currentCenterX ? "end" : "start");
    });
  });
  
  
  

  // Link arc function for curved links
  function linkArc(d) {
    const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
    const numWaves = settings.waveCount;
    const waveAmplitude = settings.waveAmp;
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

  // Dragging behavior to allow movement of nodes
  function drag(simulation) {
    function dragstarted(d) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d) {
      d.fx = Math.max(0, Math.min(width, d3.event.x));
      d.fy = Math.max(0, Math.min(height, d3.event.y));
    }

    function dragended(d) {
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

});
