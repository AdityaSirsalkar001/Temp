import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useInterval } from '../lib/hooks.js';
import { usePersistentState } from '../lib/hooks.js';
import { load, save } from '../lib/storage.js';
import { playStart, playPause, playStop, playSessionEnd } from '../lib/sound.js';
import { load as loadLS } from '../lib/storage.js';

function fmt(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function incTodaySeconds(delta = 1) {
  const key = 'stats:focus';
  const stats = load(key, {});
  const k = dateKey();
  const cur = stats[k] || { seconds: 0, sessions: 0 };
  cur.seconds += delta;
  stats[k] = cur;
  save(key, stats);
}

function incTodaySessions() {
  const key = 'stats:focus';
  const stats = load(key, {});
  const k = dateKey();
  const cur = stats[k] || { seconds: 0, sessions: 0 };
  cur.sessions += 1;
  stats[k] = cur;
  save(key, stats);
}

export default function FocusTimer() {
  const [settings, setSettings] = usePersistentState('timer:settings', {
    focusMin: 25,
    shortBreakMin: 5,
    longBreakMin: 15,
    roundsUntilLong: 4,
    autoStartBreaks: false,
    autoStartFocus: true
  });

  const [showSettings, setShowSettings] = useState(false);
  const [modeType, setModeType] = usePersistentState('timer:type', 'timer'); // 'timer' | 'stopwatch'

  // Timer state
  const [mode, setMode] = usePersistentState('timer:mode', 'focus'); // 'focus' | 'short' | 'long'
  const [round, setRound] = usePersistentState('timer:round', 1);
  const [remaining, setRemaining] = usePersistentState('timer:remaining', 25 * 60);
  const [running, setRunning] = usePersistentState('timer:running', false);

  // Stopwatch state
  const [swElapsed, setSwElapsed] = usePersistentState('stopwatch:elapsed', 0);
  const [swRunning, setSwRunning] = usePersistentState('stopwatch:running', false);
  const [swActive, setSwActive] = usePersistentState('stopwatch:active', false);

  // Fullscreen state
  const wrapRef = useRef(null);
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      wrapRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  // derive total based on mode
  const total = useMemo(() => (
    mode === 'focus' ? settings.focusMin * 60 : mode === 'short' ? settings.shortBreakMin * 60 : settings.longBreakMin * 60
  ), [mode, settings.focusMin, settings.shortBreakMin, settings.longBreakMin]);

  // keep remaining synced to total
  useEffect(() => { if (modeType === 'timer') setRemaining(total); }, [total, modeType]);

  useInterval(() => {
    if (modeType !== 'timer' || !running) return;
    if (mode === 'focus') incTodaySeconds(1);
    setRemaining((r) => {
      if (r > 1) return r - 1;
      handleComplete();
      return 0;
    });
  }, 1000);

  useInterval(() => {
    if (modeType !== 'stopwatch' || !swRunning) return;
    setSwElapsed((v) => v + 1);
    incTodaySeconds(1);
  }, 1000);

  function handleComplete() { 
    if (loadLS('settings:sound', true)) playSessionEnd();
    setRunning(false);
    if (mode === 'focus') {
      incTodaySessions();
      if (round >= settings.roundsUntilLong) {
        setMode('long');
        setRound(1);
        if (settings.autoStartBreaks) setRunning(true);
      } else {
        setMode('short');
        setRound(round + 1);
        if (settings.autoStartBreaks) setRunning(true);
      }
    } else {
      setMode('focus');
      if (settings.autoStartFocus) setRunning(true);
    }
  }

  function start() { setRunning(true); if (loadLS('settings:sound', true)) playStart(); }
  function pause() { setRunning(false); if (loadLS('settings:sound', true)) playPause(); }
  function reset() { setRunning(false); setRemaining(total); }

  function switchMode(next) {
    setRunning(false);
    setMode(next);
    if (next === 'focus') setRound(1);
    setRemaining(next === 'focus' ? settings.focusMin * 60 : next === 'short' ? settings.shortBreakMin * 60 : settings.longBreakMin * 60);
  }

  // Stopwatch controls
  function swStart() { setSwRunning(true); setSwActive(true); }
  function swPause() {
    setSwRunning(false);
    if (swElapsed > 0 && swActive) { incTodaySessions(); setSwActive(false); }
  }
  function swReset() { setSwRunning(false); setSwElapsed(0); setSwActive(false); }

  const title = useMemo(() => mode === 'focus' ? 'Focus' : mode === 'short' ? 'Short Break' : 'Long Break', [mode]);

  // Progress calculation
  const progress = modeType === 'timer' ? (total - remaining) / total : (swElapsed % 3600) / 3600;
  const progressPercent = Math.max(0, Math.min(100, progress * 100));

  function stopTimer() { setRunning(false); setRemaining(total); if (loadLS('settings:sound', true)) playStop(); }
  function stopStopwatch() { 
    if (swElapsed > 0 && swActive) { incTodaySessions(); } 
    setSwRunning(false); setSwElapsed(0); setSwActive(false); 
    if (loadLS('settings:sound', true)) playStop(); 
  }

  // Get theme class based on mode
  const getThemeClass = () => {
    if (modeType === 'stopwatch') return 'theme-stopwatch';
    return mode === 'focus' ? 'theme-focus' : mode === 'short' ? 'theme-break' : 'theme-long-break';
  };

  function updateSettings(newSettings) {
    setSettings(newSettings);
    // Reset timer if not running
    if (!running && modeType === 'timer') {
      const newTotal = mode === 'focus' ? newSettings.focusMin * 60 : 
                     mode === 'short' ? newSettings.shortBreakMin * 60 : 
                     newSettings.longBreakMin * 60;
      setRemaining(newTotal);
    }
  }

  return (
    <div ref={wrapRef} className={`timer-container ${getThemeClass()} ${isFs ? 'fullscreen-mode' : ''} ${(running || swRunning) ? 'running' : ''} ${remaining === 0 ? 'completed' : ''}`}>
      <div className={`timer-panel ${isFs ? 'fullscreen-panel' : 'panel'}`}>
        {!isFs && (
          <div className="timer-header">
            <h3 className="panel-title">🎯 Focus Timer</h3>
            <button 
              className="settings-btn"
              onClick={() => setShowSettings(!showSettings)}
              title="Timer Settings"
            >
              ⚙️
            </button>
          </div>
        )}

        {isFs && (
          <div className="fullscreen-header">
            <div className="fs-title">{title}</div>
            <button className="exit-fs-btn" onClick={toggleFullscreen}>✕</button>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && !isFs && (
          <div className="settings-panel">
            <h4>Timer Settings</h4>
            <div className="settings-grid">
              <div className="setting-item">
                <label>Focus Time</label>
                <input 
                  type="number" 
                  min="1" 
                  max="120" 
                  value={settings.focusMin}
                  onChange={(e) => updateSettings({...settings, focusMin: parseInt(e.target.value) || 25})}
                  className="setting-input"
                />
                <span>minutes</span>
              </div>
              <div className="setting-item">
                <label>Short Break</label>
                <input 
                  type="number" 
                  min="1" 
                  max="30" 
                  value={settings.shortBreakMin}
                  onChange={(e) => updateSettings({...settings, shortBreakMin: parseInt(e.target.value) || 5})}
                  className="setting-input"
                />
                <span>minutes</span>
              </div>
              <div className="setting-item">
                <label>Long Break</label>
                <input 
                  type="number" 
                  min="1" 
                  max="60" 
                  value={settings.longBreakMin}
                  onChange={(e) => updateSettings({...settings, longBreakMin: parseInt(e.target.value) || 15})}
                  className="setting-input"
                />
                <span>minutes</span>
              </div>
            </div>
            <div className="preset-buttons">
              <button onClick={() => updateSettings({...settings, focusMin: 25, shortBreakMin: 5, longBreakMin: 15})} className="preset-btn">25/5/15</button>
              <button onClick={() => updateSettings({...settings, focusMin: 50, shortBreakMin: 10, longBreakMin: 20})} className="preset-btn">50/10/20</button>
              <button onClick={() => updateSettings({...settings, focusMin: 90, shortBreakMin: 15, longBreakMin: 30})} className="preset-btn">90/15/30</button>
            </div>
          </div>
        )}

        <div className="timer-content">
          {!isFs && (
            <div className="timer-modes">
              <button className={`mode-btn ${modeType === 'timer' ? 'active' : ''}`} onClick={() => setModeType('timer')}>Timer</button>
              <button className={`mode-btn ${modeType === 'stopwatch' ? 'active' : ''}`} onClick={() => setModeType('stopwatch')}>Stopwatch</button>
            </div>
          )}

          {modeType === 'timer' && (
            <>
              {!isFs && (
                <div className="timer-types">
                  <button className={`type-btn ${mode === 'focus' ? 'active' : ''}`} onClick={() => switchMode('focus')}>
                    Focus ({settings.focusMin}m)
                  </button>
                  <button className={`type-btn ${mode === 'short' ? 'active' : ''}`} onClick={() => switchMode('short')}>
                    Break ({settings.shortBreakMin}m)
                  </button>
                  <button className={`type-btn ${mode === 'long' ? 'active' : ''}`} onClick={() => switchMode('long')}>
                    Long ({settings.longBreakMin}m)
                  </button>
                </div>
              )}

              <div className="timer-display">
                <div className="timer-circle">
                  <svg className="progress-ring" width="200" height="200">
                    <defs>
                      <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                      <linearGradient id="breakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                      <linearGradient id="longBreakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                      <linearGradient id="stopwatchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#14b8a6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                    <circle className="progress-track" cx="100" cy="100" r="90"></circle>
                    <circle
                      className="progress-fill"
                      cx="100"
                      cy="100"
                      r="90"
                      stroke={`url(#${
                        modeType === 'stopwatch' ? 'stopwatchGradient' :
                        mode === 'focus' ? 'focusGradient' :
                        mode === 'short' ? 'breakGradient' : 'longBreakGradient'
                      })`}
                      style={{
                        strokeDasharray: `${2 * Math.PI * 90}`,
                        strokeDashoffset: `${2 * Math.PI * 90 * (1 - progress)}`,
                      }}
                    ></circle>
                  </svg>
                  <div className="timer-time">{fmt(remaining)}</div>
                </div>
                
                {!isFs && (
                  <div className="timer-info">
                    <div className="round-info">Round {round} / {settings.roundsUntilLong}</div>
                    <div className="mode-info">{title}</div>
                  </div>
                )}
              </div>
            </>
          )}

          {modeType === 'stopwatch' && (
            <div className="timer-display">
              <div className="timer-circle">
                <svg className="progress-ring" width="200" height="200">
                  <defs>
                    <linearGradient id="stopwatchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#14b8a6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  <circle className="progress-track" cx="100" cy="100" r="90"></circle>
                  <circle
                    className="progress-fill"
                    cx="100"
                    cy="100"
                    r="90"
                    stroke="url(#stopwatchGradient)"
                    style={{
                      strokeDasharray: `${2 * Math.PI * 90}`,
                      strokeDashoffset: `${2 * Math.PI * 90 * (1 - progress)}`,
                    }}
                  ></circle>
                </svg>
                <div className="timer-time">{fmt(swElapsed)}</div>
              </div>
            </div>
          )}

          <div className="timer-controls">
            {modeType === 'timer' ? (
              <>
                {!running ? (
                  <button className="btn primary large" onClick={start}>
                    ▶️ Start {mode === 'focus' ? 'Focus' : 'Break'}
                  </button>
                ) : (
                  <button className="btn secondary large" onClick={pause}>
                    ⏸️ Pause
                  </button>
                )}
                <button className="btn secondary" onClick={reset}>🔄 Reset</button>
                {!isFs && (
                  <button className="btn focus-mode" onClick={toggleFullscreen}>
                    🎯 Focus Mode
                  </button>
                )}
                {isFs && (
                  <button className="btn danger" onClick={stopTimer}>⏹️ Stop</button>
                )}
              </>
            ) : (
              <>
                {!swRunning ? (
                  <button className="btn primary large" onClick={swStart}>▶️ Start</button>
                ) : (
                  <button className="btn secondary large" onClick={swPause}>⏸️ Pause</button>
                )}
                <button className="btn secondary" onClick={swReset}>🔄 Reset</button>
                {!isFs && (
                  <button className="btn focus-mode" onClick={toggleFullscreen}>
                    🎯 Focus Mode
                  </button>
                )}
                {isFs && (
                  <button className="btn danger" onClick={stopStopwatch}>⏹️ Stop</button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
