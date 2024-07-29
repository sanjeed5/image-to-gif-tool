import React, { useState, useRef, useEffect } from 'react';
import { useSpring, animated } from 'react-spring';
import GIF from 'gif.js';

const ImageToGifTool = () => {
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [gifUrl, setGifUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef(null);
  const frontImageRef = useRef(null);
  const backImageRef = useRef(null);

  const [flipped, setFlipped] = useState(false);
  const { transform, opacity } = useSpring({
    opacity: flipped ? 1 : 0,
    transform: `perspective(600px) rotateY(${flipped ? 180 : 0}deg)`,
    config: { mass: 5, tension: 500, friction: 80 },
  });

  useEffect(() => {
    loadDefaultImage('https://picsum.photos/300/200?random=1', 'front');
    loadDefaultImage('https://picsum.photos/300/200?random=2', 'back');
  }, []);

  const loadDefaultImage = (url, side) => {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onload = (e) => {
          side === 'front' ? setFrontImage(e.target.result) : setBackImage(e.target.result);
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => console.error('Error loading default image:', error));
  };

  const handleImageUpload = (event, side) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        side === 'front' ? setFrontImage(e.target.result) : setBackImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const createGif = () => {
    if (!frontImage || !backImage) {
      alert('Please upload both images first.');
      return;
    }

    setIsLoading(true);

    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: 300,
      height: 200,
      workerScript: process.env.PUBLIC_URL + '/gif.worker.js',
    });

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const totalFrames = 240; // 8 seconds total at 30fps
    const sideDuration = 60; // 2 seconds for each side
    const transitionFrames = 60; // 2 seconds for each transition

    const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    for (let i = 0; i < totalFrames; i++) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const cycle = Math.floor(i / (sideDuration + transitionFrames));
      const cycleFrame = i % (sideDuration + transitionFrames);

      if (cycleFrame < sideDuration) {
        // Show current side
        ctx.drawImage(cycle % 2 === 0 ? frontImageRef.current : backImageRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        // Transition period
        const progress = (cycleFrame - sideDuration) / transitionFrames;
        const easedProgress = easeInOutQuad(progress);
        const scale = Math.cos(easedProgress * Math.PI);
        
        ctx.save();
        ctx.translate(canvas.width / 2, 0);
        ctx.scale(Math.abs(scale), 1);
        ctx.translate(-canvas.width / 2, 0);
        
        if (scale > 0) {
          ctx.drawImage(cycle % 2 === 0 ? frontImageRef.current : backImageRef.current, 0, 0, canvas.width, canvas.height);
        } else {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(cycle % 2 === 0 ? backImageRef.current : frontImageRef.current, 0, 0, canvas.width, canvas.height);
        }
        
        ctx.restore();
      }

      gif.addFrame(ctx, { copy: true, delay: 33 }); // ~30fps
    }

    gif.on('finished', (blob) => {
      setGifUrl(URL.createObjectURL(blob));
      setIsLoading(false);
    });

    gif.render();
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Image to GIF Tool</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="frontImage" style={{ marginRight: '10px' }}>Front Image:</label>
        <input id="frontImage" type="file" onChange={(e) => handleImageUpload(e, 'front')} accept="image/*" />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="backImage" style={{ marginRight: '10px' }}>Back Image:</label>
        <input id="backImage" type="file" onChange={(e) => handleImageUpload(e, 'back')} accept="image/*" />
      </div>
      
      <div style={{ position: 'relative', width: '300px', height: '200px', marginBottom: '20px' }}>
        <animated.div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: opacity.to(o => 1 - o),
            transform,
          }}
        >
          {frontImage && <img ref={frontImageRef} src={frontImage} alt="Front" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </animated.div>
        <animated.div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity,
            transform: transform.to(t => `${t} rotateY(180deg)`),
          }}
        >
          {backImage && <img ref={backImageRef} src={backImage} alt="Back" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </animated.div>
      </div>
      
      <button onClick={() => setFlipped(state => !state)} style={{ marginRight: '10px' }}>Flip</button>
      <button onClick={createGif} disabled={isLoading}>
        {isLoading ? 'Creating GIF...' : 'Create GIF'}
      </button>
      
      {gifUrl && (
        <div style={{ marginTop: '20px' }}>
          <h2>Generated GIF</h2>
          <img src={gifUrl} alt="Generated GIF" style={{ maxWidth: '100%', height: 'auto' }} />
          <div style={{ marginTop: '10px' }}>
            <a href={gifUrl} download="animation.gif" style={{ textDecoration: 'none', padding: '10px', backgroundColor: '#4CAF50', color: 'white', borderRadius: '5px' }}>Download GIF</a>
          </div>
        </div>
      )}
      
      <canvas ref={canvasRef} style={{ display: 'none' }} width={300} height={200} />
    </div>
  );
};

export default ImageToGifTool;