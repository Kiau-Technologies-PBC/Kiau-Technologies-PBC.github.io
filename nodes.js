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

  // Create elastic band physics - simple and performance-friendly
  const bandSegments = isMobile ? 1 : 2; // Just 1-2 segments for elastic feel
  const ropeNodes = [];
  const ropeLinks = [];
  
  links.forEach((link, linkIndex) => {
    const segments = [];
    
    // Create minimal intermediate nodes for elastic band effect
    for (let i = 1; i <= bandSegments; i++) {
      const segmentNode = {
        id: `band_${linkIndex}_${i}`,
        isRopeSegment: true,
        parentLink: link,
        segmentIndex: i
      };
      ropeNodes.push(segmentNode);
      segments.push(segmentNode);
    }
    
    // Create simple elastic connections: source -> segments -> target
    const allPoints = [link.source, ...segments, link.target];
    
    for (let i = 0; i < allPoints.length - 1; i++) {
      ropeLinks.push({
        source: allPoints[i],
        target: allPoints[i + 1],
        isRope: true,
        distance: settings.linkDistance / (bandSegments + 1),
        strength: 0.8 // Strong elastic connection
      });
    }
    
    // Store segments on the original link for rendering
    link.ropeSegments = segments;
  });

  // Combine all nodes (original + rope segments)
  const allNodes = [...nodes, ...ropeNodes];

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

  // Add special yellow glow filter for Kiau Technologies node
  const yellowGlowFilter = defs.append("filter")
    .attr("id", "yellowGlow")
    .attr("height", "400%")
    .attr("width", "400%")
    .attr("x", "-150%")
    .attr("y", "-150%");

  if (!isMobile) {
    const yellowBlur = yellowGlowFilter.append("feGaussianBlur")
      .attr("in", "SourceGraphic")
      .attr("stdDeviation", 8)
      .attr("result", "yellowBlur");

    const colorMatrix = yellowGlowFilter.append("feColorMatrix")
      .attr("in", "yellowBlur")
      .attr("type", "matrix")
      .attr("values", "1 1 0.3 0 0  1 1 0.3 0 0  0.8 0.8 0.2 0 0  0 0 0 1 0")
      .attr("result", "yellowGlow");

    const yellowMerge = yellowGlowFilter.append("feMerge");
    yellowMerge.append("feMergeNode").attr("in", "yellowGlow");
    yellowMerge.append("feMergeNode").attr("in", "SourceGraphic");
  }

  // Add bioluminescent pulse filter
  const bioGlowFilter = defs.append("filter")
    .attr("id", "bioGlow")
    .attr("height", "300%")
    .attr("width", "300%")
    .attr("x", "-100%")
    .attr("y", "-100%");

  if (!isMobile) {
    const bioBlur = bioGlowFilter.append("feGaussianBlur")
      .attr("in", "SourceGraphic")
      .attr("stdDeviation", 6)
      .attr("result", "bioBlur");

    // Create organic bioluminescent color - cyan/blue-green
    const bioColorMatrix = bioGlowFilter.append("feColorMatrix")
      .attr("in", "bioBlur")
      .attr("type", "matrix")
      .attr("values", "0.2 1 0.8 0 0  0.3 1 1 0 0  0.1 0.8 1 0 0  0 0 0 1 0")
      .attr("result", "bioColor");

    const bioMerge = bioGlowFilter.append("feMerge");
    bioMerge.append("feMergeNode").attr("in", "bioColor");
    bioMerge.append("feMergeNode").attr("in", "SourceGraphic");
  }

  // Initialize the simulation with forces - focused on elastic band feel
  const simulation = d3.forceSimulation(allNodes)
    .force("link", d3.forceLink([...links, ...ropeLinks]).id(d => d.id)
      .distance(d => d.isRope ? d.distance : settings.linkDistance)
      .strength(d => d.isRope ? d.strength : 0.4))
    .force("charge", d3.forceManyBody().strength(d => {
      if (d.isRopeSegment) return isMobile ? -8 : -15; // Minimal repulsion for elastic segments
      return isMobile ? -80 : -180; // Increased repulsion for more spread
    }))
    .force("center", d3.forceCenter(settings.centerX, settings.centerY))
    .force("collision", d3.forceCollide().radius(d => {
      if (d.isRopeSegment) return 1; // Very small collision for elastic segments
      return settings.nodeRadius * 3; // Slightly larger collision radius
    }))
    .force("directional", isMobile ? d3.forceX(settings.centerX).strength(.05) : null)
    .force("gravity", d3.forceY().strength(d => {
      // Very subtle gravity for elastic droop
      return d.isRopeSegment ? 0.01 : 0;
    }))
    .alphaDecay(0.02) // Faster settling
    .velocityDecay(0.6); // More damping for stable elastic feel
  
  let mouseX = settings.centerX, mouseY = settings.centerY;
  let mouseInfluence = 0;
  
  svg.on("mousemove", function() {
    const [x, y] = d3.mouse(this);
    mouseX = x;
    mouseY = y;
    mouseInfluence = 1; // Mouse is active
  }).on("mouseleave", function() {
    mouseInfluence = 0; // Mouse left, reduce influence
  });

  // Special node position for "Kiau Technologies"
  const specialNode = allNodes.find(node => node.id === 'Kiau Technologies');
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
        .force("link", d3.forceLink([...links, ...ropeLinks]).id(d => d.id)
          .distance(d => d.isRope ? d.distance : settings.linkDistance)
          .strength(d => d.isRope ? d.strength : 0.3))
        .force("collision", d3.forceCollide().radius(d => {
          if (d.isRopeSegment) return 1;
          return settings.nodeRadius * 2.5;
        }))
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
  const textFillColor = isDayMode ? getComputedStyle(root).getPropertyValue('--text-fill-color-day').trim() : getComputedStyle(root).getPropertyValue('--text-fill-color-night').trim();

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

  // Create rope paths (string-like connections)
  const ropeGroup = svg.append("g").attr("class", "ropes");
  
  const ropes = ropeGroup.selectAll("path")
    .data(links)
    .enter().append("path")
    .attr("fill", "none")
    .attr("stroke", linkColor)
    .attr("stroke-width", settings.strokeSize * 0.8) // Slightly thinner for rope look
    .attr("stroke-linecap", "round")
    .attr("opacity", 0.8)
    .attr("filter", (!isDayMode && !isMobile) ? "url(#glow)" : null);

  // Create invisible rope segment nodes (for physics only, not visual)
  const ropeSegmentNodes = svg.append("g")
    .selectAll("circle")
    .data(ropeNodes)
    .enter().append("circle")
    .attr("r", 0) // Invisible
    .attr("fill", "transparent");

  // Bioluminescent pulse system
  const pulseGroup = svg.append("g").attr("class", "pulses");
  let activePulses = [];
  let pulseIdCounter = 0;

  // Function to create a pulse along a connection
  function createPulse(link) {
    const pulseId = ++pulseIdCounter;
    const pulseColor = isDayMode ? "#4a9eff" : "#00ffaa";
    const tailLength = isMobile ? 3 : 5; // Number of tail segments
    
    const pulseData = {
      id: pulseId,
      link: link,
      progress: 0,
      speed: 0.008 + Math.random() * 0.012, // Organic variation in speed
      intensity: 0.6 + Math.random() * 0.4, // Varying glow intensity
      size: isMobile ? 3 : 4 + Math.random() * 3,
      color: pulseColor,
      tail: [] // Array to store tail elements
    };

    // Create the main pulse element
    const pulse = pulseGroup.append("circle")
      .attr("class", "bio-pulse-main")
      .attr("r", pulseData.size)
      .attr("fill", pulseColor)
      .attr("opacity", 0)
      .attr("filter", !isMobile ? "url(#bioGlow)" : null);

    pulseData.element = pulse;

    // Create tail segments
    for (let i = 0; i < tailLength; i++) {
      const tailSegment = pulseGroup.append("circle")
        .attr("class", "bio-pulse-tail")
        .attr("r", pulseData.size * (0.8 - i * 0.15)) // Decreasing size
        .attr("fill", pulseColor)
        .attr("opacity", 0)
        .attr("filter", !isMobile ? "url(#bioGlow)" : null);
      
      pulseData.tail.push({
        element: tailSegment,
        delay: i + 1, // Frames behind the main pulse
        opacity: pulseData.intensity * (0.7 - i * 0.12) // Decreasing opacity
      });
    }

    activePulses.push(pulseData);

    // Fade in main pulse
    pulse.transition()
      .duration(200)
      .attr("opacity", pulseData.intensity);

    return pulseData;
  }

  // Function to get position along a path
  function getPositionAlongPath(link, progress) {
    if (!link.ropeSegments || link.ropeSegments.length === 0) {
      // Direct line interpolation
      const x = link.source.x + (link.target.x - link.source.x) * progress;
      const y = link.source.y + (link.target.y - link.source.y) * progress;
      return { x, y };
    }

    // Interpolate along rope segments
    const points = [link.source, ...link.ropeSegments, link.target];
    const totalSegments = points.length - 1;
    const segmentProgress = progress * totalSegments;
    const segmentIndex = Math.floor(segmentProgress);
    const localProgress = segmentProgress - segmentIndex;

    if (segmentIndex >= totalSegments) {
      return { x: points[points.length - 1].x, y: points[points.length - 1].y };
    }

    const startPoint = points[segmentIndex];
    const endPoint = points[segmentIndex + 1];

    return {
      x: startPoint.x + (endPoint.x - startPoint.x) * localProgress,
      y: startPoint.y + (endPoint.y - startPoint.y) * localProgress
    };
  }

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
    .attr("filter", d => d.id === 'Kiau Technologies' && !isMobile ? "url(#yellowGlow)" : null)
  
    node.each(function(d) {
      const nodeGroup = d3.select(this);
    
      const anchor = nodeGroup.append("a")
        .attr("xlink:href", () => getNodeUrl(d.id))
        .attr("role", "link")
        .attr("tabindex", 0)
        .attr("aria-hidden", "true");
    
      // Use smooth circular positioning from the start
      const text = anchor.append("text")
        .attr("class", "main-text")
        .attr("x", 15) // Start with a default offset
        .attr("y", 0)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-size", isSpecialNode(d.id) ? settings.specialFontSize : settings.normalFontSize)
        .attr("fill", textFillColor)
        .text(d.id);
    
      text.attr("aria-label", d.id);
    
      text.clone(true).lower()
        .attr("class", "text-glow")
        .attr("stroke", textStrokeColor)
        .attr("stroke-width", 5)
        .attr("stroke-linejoin", "round")
        .attr("fill", "none") // Stroke-only for the background glow
        .attr("filter", d.id === 'Kiau Technologies' && !isMobile ? "url(#yellowGlow)" : null);
    });
    
    
  

  let frameCount = 0;
  let lastPulseTime = Date.now() - 3000; // Start with offset to trigger first pulse quickly
  const pulseInterval = isMobile ? 1500 : 1000; // Spawn pulse every 1-1.5 seconds (more frequent)
  
  // Independent pulse animation system - runs continuously regardless of simulation state
  let pulseAnimationId;
  
  function pulseAnimationLoop() {
    // Update all active pulses
    updatePulses();
    
    // Spawn new pulses based on timing
    const currentTime = Date.now();
    if (currentTime - lastPulseTime > pulseInterval + Math.random() * 1000) {
      spawnRandomPulse();
      lastPulseTime = currentTime;
    }
    
    // Continue the animation loop
    pulseAnimationId = requestAnimationFrame(pulseAnimationLoop);
  }
  
  // Start the independent pulse system
  setTimeout(() => {
    spawnRandomPulse();
    console.log("Initial pulse spawned");
    pulseAnimationLoop(); // Start the continuous animation loop
  }, 1000);

  // Update rope and node positions during simulation ticks
  simulation.on("tick", () => {
    frameCount++;
    
    // No anchor updates needed - simple elastic band physics
    
    // Update rope paths - throttle for performance
    if (frameCount % 2 === 0) { // Update every other frame for better performance
      ropes.attr("d", d => createRopePath(d));
    }
    
    // Update rope segment positions (invisible nodes)
    ropeSegmentNodes.attr("transform", d => `translate(${d.x},${d.y})`);
    
    node.attr("transform", d => {
      // Only constrain main nodes, let elastic segments move freely
      if (!d.isRopeSegment) {
        d.x = Math.max(settings.boundPaddingW, Math.min(width - settings.boundPaddingW, d.x));
        d.y = Math.max(settings.boundPaddingH, Math.min(height - settings.boundPaddingH, d.y));
      }
      return `translate(${d.x},${d.y})`;
    });
  
    // Apply mouse forces to rope segments for interactive string physics
    addMouseForceToRopes();
    
    node.each(function(d) {
      // Only update text for main nodes, not rope segments
      if (!d.isRopeSegment) {
        const anchor = d3.select(this).select("a");
        const currentCenterX = width / 2;
        const currentCenterY = height / 2;
        
        // Calculate angle and distance from center for smooth circular positioning
        const deltaX = d.x - currentCenterX;
        const deltaY = d.y - currentCenterY;
        const angle = Math.atan2(deltaY, deltaX);
        const distance = Math.hypot(deltaX, deltaY);
        
        // Base offset distance from node center
        const baseOffset = 15;
        const scaledOffset = Math.min(baseOffset + distance * 0.05, 25);
        
        // Calculate smooth circular positioning around the node
        const textX = Math.cos(angle) * scaledOffset;
        const textY = Math.sin(angle) * scaledOffset;
        
        // Always use middle anchor for true smooth gliding
        anchor.selectAll("text")
          .transition()
          .duration(50)
          .ease(d3.easeLinear)
          .attr("x", textX)
          .attr("y", textY)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "central");
      }
    });
  });
  
  
  

  // Create elastic band path - simple and smooth
  function createRopePath(link) {
    if (!link.ropeSegments || link.ropeSegments.length === 0) {
      return `M${link.source.x},${link.source.y}L${link.target.x},${link.target.y}`;
    }
    
    // Build path: source -> segments -> target (simple elastic band)
    const points = [link.source, ...link.ropeSegments, link.target];
    
    const path = d3.path();
    path.moveTo(points[0].x, points[0].y);
    
    if (points.length === 2) {
      // Direct line
      path.lineTo(points[1].x, points[1].y);
    } else if (points.length === 3) {
      // Single elastic curve through middle point
      path.quadraticCurveTo(points[1].x, points[1].y, points[2].x, points[2].y);
    } else {
      // Multiple segments - smooth elastic curves
      for (let i = 1; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        path.quadraticCurveTo(current.x, current.y, 
          (current.x + next.x) / 2, (current.y + next.y) / 2);
      }
      path.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }
    
    return path.toString();
  }
  
  // Add mouse interaction for elastic band feel
  function addMouseForceToRopes() {
    // Only apply forces every few frames for performance
    if (frameCount % 3 !== 0) return;
    
    ropeNodes.forEach(ropeNode => {
      const distance = Math.hypot(mouseX - ropeNode.x, mouseY - ropeNode.y);
      if (distance < 60 && mouseInfluence > 0) {
        const force = Math.max(0, 1 - distance / 60) * 0.2; // Gentle elastic interaction
        const angle = Math.atan2(ropeNode.y - mouseY, ropeNode.x - mouseX);
        ropeNode.vx += Math.cos(angle) * force;
        ropeNode.vy += Math.sin(angle) * force;
      }
    });
  }

  // Update pulse animations
  function updatePulses() {
    activePulses = activePulses.filter(pulse => {
      pulse.progress += pulse.speed;
      
      // Initialize position history if not exists
      if (!pulse.positionHistory) {
        pulse.positionHistory = [];
      }
      
      if (pulse.progress >= 1) {
        // Pulse reached end - fade out and remove all elements
        pulse.element.transition()
          .duration(300)
          .attr("opacity", 0)
          .attr("r", pulse.size * 1.5) // Expand as it fades
          .remove();
        
        // Remove tail segments
        pulse.tail.forEach(tailSegment => {
          tailSegment.element.transition()
            .duration(300)
            .attr("opacity", 0)
            .remove();
        });
        
        return false; // Remove from active pulses
      }
      
      // Update pulse position along path
      const pos = getPositionAlongPath(pulse.link, pulse.progress);
      
      // Store position in history for tail
      pulse.positionHistory.push({ x: pos.x, y: pos.y });
      
      // Keep only necessary history for tail length
      const maxHistory = pulse.tail.length + 2;
      if (pulse.positionHistory.length > maxHistory) {
        pulse.positionHistory.shift();
      }
      
      // Organic pulsing effect - size varies as it travels
      const pulseFactor = 1 + 0.3 * Math.sin(pulse.progress * Math.PI * 4 + Date.now() * 0.005);
      const currentSize = pulse.size * pulseFactor;
      
      // Update main pulse
      pulse.element
        .attr("cx", pos.x)
        .attr("cy", pos.y)
        .attr("r", currentSize);
      
      // Update tail segments
      pulse.tail.forEach((tailSegment, index) => {
        const historyIndex = pulse.positionHistory.length - 1 - tailSegment.delay;
        
        if (historyIndex >= 0 && pulse.positionHistory[historyIndex]) {
          const tailPos = pulse.positionHistory[historyIndex];
          const tailSize = (pulse.size * (0.8 - index * 0.15)) * pulseFactor;
          
          tailSegment.element
            .attr("cx", tailPos.x)
            .attr("cy", tailPos.y)
            .attr("r", tailSize)
            .attr("opacity", tailSegment.opacity);
        } else {
          // Hide tail segment if no history available yet
          tailSegment.element.attr("opacity", 0);
        }
      });
      
      return true; // Keep pulse active
    });
  }

  // Spawn a random pulse from Kiau Technologies
  function spawnRandomPulse() {
    if (!specialNode) {
      console.log("No special node found");
      return;
    }
    
    // Find all links connected to Kiau Technologies
    const connectedLinks = links.filter(link => 
      link.source.id === 'Kiau Technologies' || link.target.id === 'Kiau Technologies'
    );
    
    if (connectedLinks.length === 0) {
      console.log("No connected links found");
      return;
    }
    
    // Pick random connection(s) - sometimes spawn multiple for organic feel
    const numPulses = Math.random() < 0.7 ? 1 : 2; // 70% chance single pulse, 30% double
    
    console.log(`Spawning ${numPulses} pulse(s) from Kiau Technologies`);
    
    for (let i = 0; i < numPulses; i++) {
      const randomLink = connectedLinks[Math.floor(Math.random() * connectedLinks.length)];
      
      // Ensure pulse travels away from Kiau Technologies
      let pulseLink = randomLink;
      if (randomLink.target.id === 'Kiau Technologies') {
        // Reverse the link direction for pulse travel
        pulseLink = {
          source: randomLink.target,
          target: randomLink.source,
          ropeSegments: randomLink.ropeSegments ? [...randomLink.ropeSegments].reverse() : null
        };
      }
      
      setTimeout(() => {
        createPulse(pulseLink);
        console.log(`Pulse created traveling to: ${pulseLink.target.id}`);
      }, i * 200); // Slight delay between multiple pulses
    }
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
