import React, { useEffect, useRef, useState, useCallback } from 'react';
import { initJanus, startBroadcast, stopBroadcast, cleanupJanus } from '../janus/janusUtils';
import { IoMdSettings as SettingsIcon } from "react-icons/io";
import { MdFullscreen as EnterFullscreenIcon, MdFullscreenExit as ExitFullscreenIcon } from "react-icons/md";
import { FaRegStopCircle } from "react-icons/fa";
import { IoMicOff, IoMic } from "react-icons/io5";
import { BsCameraVideoOff, BsCameraVideo } from "react-icons/bs";
import { MdScreenShare, MdStopScreenShare } from "react-icons/md";
import { TbPictureInPictureOn } from "react-icons/tb";

interface JanusBroadcastProps {
  streamKey: string;
  janusServer?: string;
  onError?: (error: Error) => void;
  style?: React.CSSProperties;
  className?: string;
}

export const JanusBroadcast: React.FC<JanusBroadcastProps> = ({
  streamKey,
  janusServer = 'http://localhost:8088/janus',
  onError,
  style,
  className,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreensharing, setIsScreensharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      
      setLocalStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('Failed to access camera:', error);
      if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }, [onError]);

  const stopStreaming = useCallback(async () => {
    try {
      await stopBroadcast(streamKey);
      setIsStreaming(false);
    } catch (error) {
      console.error('Failed to stop streaming:', error);
      if (onError) onError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [streamKey, onError]);

  useEffect(() => {
    const initializeJanus = async () => {
      try {
        await initJanus({
          server: janusServer,
          onError: (error) => {
            console.error('Janus initialization error:', error);
            if (onError) onError(error);
          },
          onLocalStream: (stream) => {
            setLocalStream(stream);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          }
        });
      } catch (error) {
        console.error('Failed to initialize Janus:', error);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    };

    initializeJanus();

    return () => {
      if (isStreaming) {
        stopStreaming();
      }
      cleanupJanus();
    };
  }, [janusServer, onError, isStreaming, stopStreaming]);

  const toggleStreaming = async () => {
    if (isStreaming) {
      await stopStreaming();
    } else {
      await startStreaming();
    }
  };

  const startStreaming = async () => {
    try {
      if (!localStream) {
        await startCamera();
      }
      
      if (localStream) {
        await startBroadcast(streamKey, localStream);
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Failed to start streaming:', error);
      if (onError) onError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleScreenshare = async () => {
    if (isScreensharing) {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      const cameraStream = await startCamera();
      if (cameraStream && isStreaming) {
        await stopBroadcast(streamKey);
        await startBroadcast(streamKey, cameraStream);
      }
      
      setIsScreensharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
        
        setLocalStream(screenStream);
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }
        
        if (isStreaming) {
          await stopBroadcast(streamKey);
          await startBroadcast(streamKey, screenStream);
        }
        
        setIsScreensharing(true);
      } catch (error) {
        console.error('Failed to start screensharing:', error);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const togglePiP = async () => {
    if (videoRef.current) {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    }
  };

  useEffect(() => {
    if (!localStream) {
      startCamera();
    }
  }, [localStream, startCamera]);

  return (
    <div 
      ref={containerRef}
      className={`relative ${className || ''}`} 
      style={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: 'black',
        ...style 
      }}
    >
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleStreaming} 
            className={`p-2 rounded-full ${isStreaming ? 'bg-red-600' : 'bg-green-600'}`}
          >
            {isStreaming ? <FaRegStopCircle size={20} /> : <div className="w-5 h-5 flex items-center justify-center">•</div>}
          </button>
          
          <button 
            onClick={toggleAudio} 
            className="p-2 rounded-full bg-gray-700"
          >
            {isAudioEnabled ? <IoMic size={20} /> : <IoMicOff size={20} />}
          </button>
          
          <button 
            onClick={toggleVideo} 
            className="p-2 rounded-full bg-gray-700"
          >
            {isVideoEnabled ? <BsCameraVideo size={20} /> : <BsCameraVideoOff size={20} />}
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleScreenshare} 
            className="p-2 rounded-full bg-gray-700"
          >
            {isScreensharing ? <MdStopScreenShare size={20} /> : <MdScreenShare size={20} />}
          </button>
          
          <button 
            onClick={togglePiP} 
            className="p-2 rounded-full bg-gray-700"
          >
            <TbPictureInPictureOn size={20} />
          </button>
          
          <button 
            onClick={toggleFullscreen} 
            className="p-2 rounded-full bg-gray-700"
          >
            {isFullscreen ? <ExitFullscreenIcon size={20} /> : <EnterFullscreenIcon size={20} />}
          </button>
          
          <button 
            className="p-2 rounded-full bg-gray-700"
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
