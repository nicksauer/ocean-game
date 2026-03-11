import React, { useEffect, useRef, useState } from 'react';

interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'turtle' | 'axolotl' | 'fish' | 'coin' | 'octopus' | 'projectile' | 'boss_fish';
  speedX: number;
  speedY: number;
  alive: boolean;
  color?: string;
  offset?: number;
}

interface Bubble {
  x: number;
  y: number;
  size: number;
  speed: number;
  offset: number;
}

const OceanGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameWin, setGameWin] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isDay, setIsDay] = useState(true);
  const [bossHP, setBossHP] = useState(100);

  const gameState = useRef({
    player: { x: 100, y: 300, width: 80, height: 50, type: 'turtle' as const, speedX: 0, speedY: 0, alive: true },
    companion: { x: 50, y: 320, width: 60, height: 25, type: 'axolotl' as const, speedX: 0, speedY: 0, alive: true },
    entities: [] as Entity[],
    bubbles: [] as Bubble[],
    coins: 0,
    frame: 0,
    keys: {} as Record<string, boolean>,
    bossActive: false,
    bossHealth: 100,
    lastShotFrame: 0,
    lastBossAttackFrame: 0,
  });

  useEffect(() => {
    for(let i=0; i<30; i++) {
      gameState.current.bubbles.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        size: Math.random() * 4 + 1,
        speed: Math.random() * 1 + 0.5,
        offset: Math.random() * Math.PI * 2
      });
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      gameState.current.keys[e.code] = true;
      if (e.code === 'Space') fireProjectile();
    };
    const handleKeyUp = (e: KeyboardEvent) => (gameState.current.keys[e.code] = false);
    const handleClick = () => fireProjectile();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [gameStarted, gameOver, gameWin]);

  const fireProjectile = () => {
    const state = gameState.current;
    if (!gameStarted || gameOver || gameWin || !state.bossActive || state.coins <= 0) return;
    if (state.frame - state.lastShotFrame < 12) return; // Faster shooting

    state.coins--;
    setScore(state.coins);
    state.lastShotFrame = state.frame;
    
    state.entities.push({
      x: state.player.x + 80,
      y: state.player.y + 20,
      width: 20,
      height: 20,
      type: 'projectile',
      speedX: 10,
      speedY: 0,
      alive: true,
    });
  };

  const resetGame = () => {
    gameState.current.player = { x: 100, y: 300, width: 80, height: 50, type: 'turtle', speedX: 0, speedY: 0, alive: true };
    gameState.current.companion = { x: 50, y: 320, width: 60, height: 25, type: 'axolotl', speedX: 0, speedY: 0, alive: true };
    gameState.current.entities = [];
    gameState.current.coins = 0;
    gameState.current.frame = 0;
    gameState.current.keys = {};
    gameState.current.bossActive = false;
    gameState.current.bossHealth = 100;
    gameState.current.lastBossAttackFrame = 0;
    
    setScore(0);
    setLevel(1);
    setGameOver(false);
    setGameWin(false);
    setGameStarted(true);
    setIsDay(true);
    setBossHP(100);
  };

  const triggerFinalLevel = () => {
    if (!gameStarted || gameOver || gameWin) return;
    gameState.current.coins = 40;
    setScore(40);
    setLevel(5);
  };

  useEffect(() => {
    if (!gameStarted || gameOver || gameWin) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const spawnEntity = () => {
      const state = gameState.current;
      const type = (state.bossActive) ? 'coin' : (Math.random() > 0.3 ? 'fish' : 'coin');
      const fishColors = ['#ff7f50', '#ff6347', '#ff4500', '#1e90ff', '#00ced1', '#ff1493'];
      
      state.entities.push({
        x: canvas.width + 50,
        y: Math.random() * (canvas.height - 100) + 50,
        width: type === 'fish' ? 50 : 30,
        height: type === 'fish' ? 30 : 30,
        type: type as any,
        speedX: -(2 + Math.random() * 2 + (state.coins / 15)),
        speedY: (Math.random() - 0.5) * 0.5,
        alive: true,
        color: fishColors[Math.floor(Math.random() * fishColors.length)],
        offset: Math.random() * Math.PI * 2
      });
    };

    const bossAttack = () => {
      const state = gameState.current;
      const boss = state.entities.find(e => e.type === 'octopus');
      if (!boss) return;

      // Shoot an "Angry Fish" at the player
      state.entities.push({
        x: boss.x + 50,
        y: boss.y + 125,
        width: 40,
        height: 25,
        type: 'boss_fish',
        speedX: -6,
        speedY: (state.player.y - (boss.y + 125)) / 60, // Aim towards player
        alive: true,
        color: '#ff0000',
      });
    };

    const update = () => {
      const state = gameState.current;
      state.frame++;

      if (state.frame % 1500 === 0) setIsDay(prev => !prev);

      state.bubbles.forEach(b => {
        b.y -= b.speed;
        b.x += Math.sin(state.frame * 0.05 + b.offset) * 0.5;
        if (b.y < -10) { b.y = canvas.height + 10; b.x = Math.random() * canvas.width; }
      });

      const speed = 5;
      if (state.keys['ArrowUp'] || state.keys['KeyW']) state.player.y -= speed;
      if (state.keys['ArrowDown'] || state.keys['KeyS']) state.player.y += speed;
      if (state.keys['ArrowLeft'] || state.keys['KeyA']) state.player.x -= speed;
      if (state.keys['ArrowRight'] || state.keys['KeyD']) state.player.x += speed;

      state.player.x = Math.max(0, Math.min(canvas.width - state.player.width, state.player.x));
      state.player.y = Math.max(0, Math.min(canvas.height - state.player.height, state.player.y));

      const targetX = state.player.x - 70;
      const targetY = state.player.y + 20 + Math.sin(state.frame * 0.1) * 10;
      state.companion.x += (targetX - state.companion.x) * 0.05;
      state.companion.y += (targetY - state.companion.y) * 0.05;

      const spawnRate = state.bossActive ? 150 : Math.max(30, 80 - state.coins);
      if (state.frame % spawnRate === 0) spawnEntity();

      // Boss Spawning
      if (state.coins >= 40 && !state.bossActive) {
        state.bossActive = true;
        state.entities = state.entities.filter(e => e.type !== 'fish');
        state.entities.push({
          x: canvas.width + 100,
          y: canvas.height / 2 - 125,
          width: 250,
          height: 250,
          type: 'octopus',
          speedX: -1.5,
          speedY: 2,
          alive: true,
        });
      }

      // Boss Logic
      if (state.bossActive) {
        if (state.frame - state.lastBossAttackFrame > 120) {
          bossAttack();
          state.lastBossAttackFrame = state.frame;
        }
      }

      state.entities.forEach(ent => {
        ent.x += ent.speedX;
        ent.y += ent.speedY + (ent.type === 'fish' ? Math.sin(state.frame * 0.1 + (ent.offset||0)) * 0.5 : 0);

        if (ent.type === 'octopus') {
          if (ent.x < canvas.width - 280) ent.speedX = 0;
          if (ent.y <= 50 || ent.y + ent.height >= canvas.height - 50) ent.speedY *= -1;
        }

        const hitboxPadding = 12;
        const isColliding = (
          state.player.x + hitboxPadding < ent.x + ent.width - hitboxPadding &&
          state.player.x + state.player.width - hitboxPadding > ent.x + hitboxPadding &&
          state.player.y + hitboxPadding < ent.y + ent.height - hitboxPadding &&
          state.player.y + state.player.height - hitboxPadding > ent.y + hitboxPadding
        );

        if (isColliding) {
          if (ent.type === 'coin') {
            ent.alive = false;
            state.coins++;
            setScore(state.coins);
            if (state.coins === 10) setLevel(2);
            if (state.coins === 20) setLevel(3);
            if (state.coins === 30) setLevel(4);
            if (state.coins === 40) setLevel(5);
          } else if (ent.type === 'fish' || ent.type === 'octopus' || ent.type === 'boss_fish') {
            setGameOver(true);
          }
        }

        if (ent.type === 'projectile') {
          const boss = state.entities.find(e => e.type === 'octopus');
          if (boss && 
              ent.x < boss.x + boss.width && 
              ent.x + ent.width > boss.x && 
              ent.y < boss.y + boss.height && 
              ent.y + ent.height > boss.y) {
            ent.alive = false;
            state.bossHealth -= 5;
            setBossHP(state.bossHealth);
            if (state.bossHealth <= 0) {
              setGameWin(true);
            }
          }
        }
      });

      state.entities = state.entities.filter(ent => ent.alive && ent.x + ent.width > -300 && ent.x < canvas.width + 300);

      draw();
      animationFrameId = requestAnimationFrame(update);
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const state = gameState.current;

      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (isDay) { bgGradient.addColorStop(0, '#00b4db'); bgGradient.addColorStop(1, '#000046'); }
      else { bgGradient.addColorStop(0, '#0f2027'); bgGradient.addColorStop(0.5, '#203a43'); bgGradient.addColorStop(1, '#2c5364'); }
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = isDay ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const startX = (state.frame * 0.5 + i * 200) % (canvas.width * 2) - canvas.width;
        ctx.moveTo(startX, 0); ctx.lineTo(startX + 150, 0); ctx.lineTo(startX + 300 + Math.sin(state.frame*0.01 + i)*100, canvas.height); ctx.lineTo(startX + 50 + Math.sin(state.frame*0.01 + i)*100, canvas.height);
        ctx.fill();
      }
      ctx.restore();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      state.bubbles.forEach(b => {
        ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill();
      });

      // Draw Turtle
      const tX = state.player.x; const tY = state.player.y;
      ctx.fillStyle = '#4a5d23';
      const fAng = Math.sin(state.frame * 0.1) * 0.3;
      ctx.save(); ctx.translate(tX + 60, tY + 40); ctx.rotate(-fAng); ctx.beginPath(); ctx.ellipse(10, 10, 20, 8, Math.PI/4, 0, Math.PI*2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(tX + 15, tY + 40); ctx.rotate(-fAng); ctx.beginPath(); ctx.ellipse(-5, 5, 15, 6, -Math.PI/6, 0, Math.PI*2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(tX + 60, tY + 10); ctx.rotate(fAng); ctx.beginPath(); ctx.ellipse(10, -10, 20, 8, -Math.PI/4, 0, Math.PI*2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(tX + 15, tY + 10); ctx.rotate(fAng); ctx.beginPath(); ctx.ellipse(-5, -5, 15, 6, Math.PI/6, 0, Math.PI*2); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#556b2f'; ctx.beginPath(); ctx.ellipse(tX + 85, tY + 25, 18, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(tX + 92, tY + 20, 2.5, 0, Math.PI * 2); ctx.fill();
      const sGrad = ctx.createRadialGradient(tX + 40, tY + 20, 10, tX + 40, tY + 25, 40);
      sGrad.addColorStop(0, '#8f9779'); sGrad.addColorStop(1, '#2f3522');
      ctx.fillStyle = sGrad; ctx.beginPath(); ctx.ellipse(tX + 40, tY + 25, 35, 22, 0, 0, Math.PI * 2); ctx.fill();

      // Draw Axolotl
      const aX = state.companion.x; const aY = state.companion.y;
      ctx.fillStyle = 'rgba(255, 182, 193, 0.6)'; ctx.beginPath(); ctx.moveTo(aX + 25, aY + 12); ctx.quadraticCurveTo(aX - 15, aY - 5, aX - 30, aY + 12 + Math.sin(state.frame*0.15)*5); ctx.quadraticCurveTo(aX - 15, aY + 30, aX + 25, aY + 12); ctx.fill();
      ctx.fillStyle = '#ffc0cb'; ctx.beginPath(); ctx.ellipse(aX + 20, aY + 12, 25, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(aX + 45, aY + 12, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff1493'; ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(aX + 35, aY + 8 + i*2); ctx.quadraticCurveTo(aX + 30, aY - 2 + i*4, aX + 25 + Math.sin(state.frame*0.05)*2, aY - 5 + i*6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(aX + 35, aY + 16 + i*2); ctx.quadraticCurveTo(aX + 30, aY + 26 + i*4, aX + 25 + Math.sin(state.frame*0.05)*2, aY + 29 + i*6); ctx.stroke(); }
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(aX + 50, aY + 9, 1.5, 0, Math.PI * 2); ctx.fill();

      state.entities.forEach(ent => {
        if (ent.type === 'coin' || ent.type === 'projectile') {
          const spin = Math.abs(Math.cos(state.frame * 0.05));
          ctx.save(); ctx.translate(ent.x + ent.width/2, ent.y + ent.height/2); ctx.scale(spin, 1);
          ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.arc(0, 0, ent.width/2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(0, 0, ent.width/2 - 2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        } else if (ent.type === 'fish' || ent.type === 'boss_fish') {
          ctx.fillStyle = ent.color || '#ff7f50';
          ctx.beginPath(); ctx.ellipse(ent.x + 25, ent.y + 15, 25, 12, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(ent.x + 40, ent.y + 15); ctx.lineTo(ent.x + 60, ent.y + 5 + Math.sin(state.frame*0.2)*5); ctx.lineTo(ent.x + 60, ent.y + 25 + Math.sin(state.frame*0.2)*5); ctx.fill();
          if (ent.type === 'boss_fish') { // Angry Eye for boss fish
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(ent.x+10, ent.y+10, 4, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'red'; ctx.beginPath(); ctx.arc(ent.x+9, ent.y+10, 2, 0, Math.PI*2); ctx.fill();
          }
        } else if (ent.type === 'octopus') {
          const oX = ent.x; const oY = ent.y;
          const pulse = Math.sin(state.frame * 0.05) * 10;
          
          ctx.shadowColor = '#da70d6'; ctx.shadowBlur = 15;
          ctx.strokeStyle = '#6a0dad'; ctx.lineWidth = 14;
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI + Math.PI/2 + (Math.sin(state.frame*0.02 + i)*0.1);
            const tLen = 140 + Math.sin(state.frame * 0.05 + i) * 40;
            ctx.beginPath(); ctx.moveTo(oX + 125, oY + 150);
            ctx.bezierCurveTo(oX + 125 + Math.cos(angle)*tLen*0.5, oY + 150 + pulse, oX + 125 + Math.cos(angle)*tLen*0.8, oY + 150 + Math.sin(angle)*tLen*0.8, oX + 125 + Math.cos(angle)*tLen, oY + 150 + Math.sin(angle)*tLen);
            ctx.stroke();
            // Suction Cups
            ctx.fillStyle = '#dda0dd';
            for(let j=0.3; j<=0.8; j+=0.2) {
              ctx.beginPath(); ctx.arc(oX+125+Math.cos(angle)*tLen*j, oY+150+Math.sin(angle)*tLen*j, 5, 0, Math.PI*2); ctx.fill();
            }
          }
          ctx.shadowBlur = 0; 
          // Mantle (Realistic Shape)
          const mGrad = ctx.createRadialGradient(oX + 125, oY + 80, 20, oX + 125, oY + 100, 100);
          mGrad.addColorStop(0, '#ba55d3'); mGrad.addColorStop(1, '#4b0082');
          ctx.fillStyle = mGrad;
          ctx.beginPath();
          ctx.moveTo(oX + 50, oY + 150);
          ctx.bezierCurveTo(oX + 50, oY + 20, oX + 200, oY + 20, oX + 200, oY + 150);
          ctx.fill();
          
          // Eyes
          ctx.fillStyle = '#ffdf00'; ctx.beginPath(); ctx.ellipse(oX + 90, oY + 130, 10, 14, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(oX + 160, oY + 130, 10, 14, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = 'black'; ctx.beginPath(); ctx.ellipse(oX + 90, oY + 130, 3, 10, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(oX + 160, oY + 130, 3, 10, 0, 0, Math.PI*2); ctx.fill();
        }
      });

      if (state.bossActive) {
        ctx.fillStyle = '#333'; ctx.fillRect(canvas.width/2 - 150, 60, 300, 20);
        ctx.fillStyle = '#ff0000'; ctx.fillRect(canvas.width/2 - 145, 65, 290 * (state.bossHealth/100), 10);
        ctx.fillStyle = 'white'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.fillText('GIANT OCTOPUS', canvas.width/2, 50);
      }
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameStarted, gameOver, gameWin, isDay]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', color: 'white', fontFamily: 'Arial, sans-serif', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', fontSize: '28px', zIndex: 10, fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', background: 'rgba(0,0,0,0.4)', padding: '10px 20px', borderRadius: '15px' }}>
        Coins: <span style={{color: '#ffd700'}}>{score}</span> | Level: {level === 5 ? <span style={{color: '#ff4500'}}>FINAL BOSS</span> : level} | {isDay ? '☀️ Day' : '🌙 Night'}
      </div>
      
      {level === 5 && !gameOver && !gameWin && (
        <div style={{ position: 'absolute', bottom: 80, fontSize: '20px', background: 'rgba(255,0,0,0.6)', padding: '10px', borderRadius: '10px', color: 'white', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>
          WATCH OUT! THE OCTOPUS IS SHOOTING ANGRY FISH!
        </div>
      )}

      {!gameStarted ? (
        <div style={{ textAlign: 'center', background: 'rgba(0,50,100,0.8)', padding: '40px', borderRadius: '20px', border: '2px solid #00b4db', zIndex: 20 }}>
          <h1 style={{ fontSize: '48px', margin: '0 0 20px 0' }}>Ocean Quest</h1>
          <button onClick={resetGame} style={{ padding: '15px 40px', fontSize: '24px', cursor: 'pointer', borderRadius: '10px', border: 'none', background: 'linear-gradient(45deg, #4facfe, #00f2fe)', color: 'white', fontWeight: 'bold' }}>Dive In</button>
        </div>
      ) : gameOver ? (
        <div style={{ textAlign: 'center', position: 'absolute', zIndex: 20, background: 'rgba(0,0,0,0.85)', padding: '40px', borderRadius: '20px' }}>
          <h1 style={{ fontSize: '48px', color: '#ff4500' }}>Game Over</h1>
          <button onClick={resetGame} style={{ padding: '15px 40px', fontSize: '24px', cursor: 'pointer', borderRadius: '10px', border: 'none', background: '#ff4500', color: 'white', fontWeight: 'bold' }}>Play Again</button>
        </div>
      ) : gameWin ? (
        <div style={{ textAlign: 'center', position: 'absolute', zIndex: 20, background: 'rgba(0,100,0,0.85)', padding: '40px', borderRadius: '20px', border: '2px solid #ffd700', boxShadow: '0 0 30px #ffd700' }}>
          <h1 style={{ fontSize: '48px', color: '#ffd700' }}>YOU SAVED THE OCEAN!</h1>
          <p style={{ fontSize: '24px' }}>The Octopus was defeated!</p>
          <button onClick={resetGame} style={{ marginTop: '20px', padding: '15px 40px', fontSize: '24px', cursor: 'pointer', borderRadius: '10px', border: 'none', background: '#ffd700', color: '#006400', fontWeight: 'bold' }}>Play Again</button>
        </div>
      ) : null}

      <canvas ref={canvasRef} width={800} height={600} style={{ border: '8px solid #222', borderRadius: '15px', cursor: 'crosshair', display: gameStarted ? 'block' : 'none' }} />
      
      {gameStarted && !gameOver && !gameWin && (
        <div onClick={triggerFinalLevel} style={{ position: 'absolute', bottom: '10px', right: '10px', width: '40px', height: '40px', cursor: 'pointer', opacity: 0.3, zIndex: 100, background: 'radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(255,215,0,0) 70%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>⭐</div>
      )}
    </div>
  );
};

export default OceanGame;
