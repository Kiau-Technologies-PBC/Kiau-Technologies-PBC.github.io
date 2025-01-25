(function() {
    const fpsCounter = document.getElementById("fpsCounter");
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 0;

    function updateFPS() {
        const currentTime = performance.now();
        frameCount++;
        if (currentTime - lastTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastTime = currentTime;
            fpsCounter.textContent = `FPS: ${fps}`;
        }
        requestAnimationFrame(updateFPS);
    }

    requestAnimationFrame(updateFPS);
})();
