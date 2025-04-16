import React, { useEffect, useRef, useState } from 'react';
import { initJanus, watchStream, stopWatching, cleanupJanus } from '../janus/janusUtils';
import { VscMute as MuteIcon } from "react-icons/vsc";
import { GoUnmute as UnmuteIcon } from "react-icons/go";
import { IoMdSettings as SettingsIcon } from "react-icons/io";
import { FaPlay as PlayIcon, FaPause as PauseIcon } from "react-icons/fa";
import { MdFullscreen as EnterFullscreenIcon, MdFullscreenExit as ExitFullscreenIcon } from "react-icons/md";

interface JanusPlayerProps {
  playbackId: string;
  janusServer?: string;
  onError?: (error: any) => void;
  autoPlay?: boolean;
  muted?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const JanusPlayer: React.FC<JanusPlayerProps> = ({
  playbackId,
  janusServer = 'http://localhost:8088/janus',
  onError,
  autoPlay = true,
  muted = false,
  style,
  className,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initializeJanus = async () => {
      try {
        await initJanus({
          server: janusServer,
          onRemoteStream: (stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              if (autoPlay) {
                videoRef.current.play().catch(console.error);
              }
              setIsLive(true);
            }
          },
          onError: (err) => {
            console.error('Janus error:', err);
            setError('Failed to connect to streaming server');
            if (onError) onError(err);
          }
        });

        // Start watching the stream
        await watchStream(playbackId);
      } catch (err) {
        console.error('Error initializing Janus:', err);
        setError('Failed to initialize streaming');
        if (onError) onError(err);
      }
    };

    initializeJanus();

    return () => {
      stopWatching().catch(console.error);
      cleanupJanus();
    };
  }, [playbackId, janusServer, autoPlay, onError]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(console.error);
        setIsFullscreen(true);
      } else {
        document.exitFullscreen().catch(console.error);
        setIsFullscreen(false);
      }
    }
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    showControlsTemporarily();
    
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden bg-black ${className || ''}`}
      style={{ width: '100%', height: '100%', ...style }}
      onMouseMove={showControlsTemporarily}
      onClick={showControlsTemporarily}
    >
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-70">
          <div className="text-center p-4">
            <div className="text-red-500 text-xl mb-2">Stream Error</div>
            <div>{error}</div>
          </div>
        </div>
      ) : (
        <>
          <video 
            ref={videoRef}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            autoPlay={autoPlay}
            muted={muted}
            playsInline
          />
          
          {showControls && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button onClick={togglePlay} className="text-white hover:text-gray-300">
                    {isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
                  </button>
                  
                  {isLive && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-white text-xs">LIVE</span>
                    </div>
                  )}
                  
                  <button onClick={toggleMute} className="text-white hover:text-gray-300">
                    {isMuted ? <MuteIcon size={20} /> : <UnmuteIcon size={20} />}
                  </button>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button className="text-white hover:text-gray-300">
                    <SettingsIcon size={20} />
                  </button>
                  
                  <button onClick={toggleFullscreen} className="text-white hover:text-gray-300">
                    {isFullscreen ? <ExitFullscreenIcon size={20} /> : <EnterFullscreenIcon size={20} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default JanusPlayer;
