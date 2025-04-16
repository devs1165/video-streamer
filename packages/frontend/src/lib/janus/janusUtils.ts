import Janus from 'janus-gateway';

// Define types for Janus
interface JanusPluginHandle {
  getId(): string;
  getPlugin(): string;
  send(options: {
    message: Record<string, unknown>;
    jsep?: unknown;
    success?: (result?: unknown) => void;
    error?: (error: Error) => void;
  }): void;
  createAnswer(options: {
    jsep: unknown;
    media?: Record<string, unknown>;
    success: (jsep: unknown) => void;
    error: (error: Error) => void;
  }): void;
  createOffer(options: {
    stream?: MediaStream;
    success: (jsep: unknown) => void;
    error: (error: Error) => void;
  }): void;
  detach(): void;
}

// Initialize Janus
let janus: any = null;
let streaming: JanusPluginHandle | null = null;
const opaqueId = "videostreamer-" + Janus.randomString(12);

export interface JanusStreamOptions {
  server: string;
  roomId?: string | number;
  pin?: string;
  onRemoteStream?: (stream: MediaStream) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
  onMessage?: (msg: Record<string, unknown>) => void;
}

/**
 * Initialize Janus
 */
export const initJanus = (options: JanusStreamOptions): Promise<void> => {
  return new Promise((resolve, reject) => {
    Janus.init({
      debug: process.env.NODE_ENV === 'development' ? "all" : false,
      callback: () => {
        // Create session
        janus = new Janus({
          server: options.server,
          success: () => {
            // Attach to streaming plugin
            janus.attach({
              plugin: "janus.plugin.streaming",
              opaqueId: opaqueId,
              success: (pluginHandle: JanusPluginHandle) => {
                streaming = pluginHandle;
                console.log(`Plugin attached! (${streaming.getPlugin()}, id=${streaming.getId()})`);
                resolve();
              },
              error: (error: Error) => {
                console.error("Error attaching plugin", error);
                if (options.onError) options.onError(error);
                reject(error);
              },
              onmessage: (msg: Record<string, unknown>, jsep: unknown) => {
                handleOnMessage(msg, jsep, options);
              },
              onremotestream: (stream: MediaStream) => {
                if (options.onRemoteStream) options.onRemoteStream(stream);
              },
              onlocalstream: (stream: MediaStream) => {
                if (options.onLocalStream) options.onLocalStream(stream);
              },
            });
          },
          error: (error: Error) => {
            console.error("Error creating session", error);
            if (options.onError) options.onError(error);
            reject(error);
          },
          destroyed: () => {
            console.log("Session destroyed");
          }
        });
      }
    });
  });
};

/**
 * Handle incoming messages from Janus
 */
const handleOnMessage = (msg: Record<string, unknown>, jsep: unknown, options: JanusStreamOptions) => {
  console.log("Got a message", msg);

  if (options.onMessage) options.onMessage(msg);

  const result = msg["result"] as Record<string, unknown> | undefined;
  if (result) {
    if (result["status"]) {
      const status = result["status"] as string;
      if (status === 'starting') console.log("Stream is starting");
      else if (status === 'started') console.log("Stream started");
      else if (status === 'stopped') console.log("Stream stopped");
    }
  } else if (msg["error"]) {
    console.error(msg["error"]);
    if (options.onError) options.onError(new Error(String(msg["error"])));
    return;
  }

  if (jsep && streaming) {
    console.log("Handling SDP", jsep);
    streaming!.createAnswer({
      jsep: jsep,
      media: { audioSend: false, videoSend: false },  // We want recvonly
      success: (jsep: unknown) => {
        console.log("Got SDP", jsep);
        const body = { request: "start" };
        streaming!.send({ message: body, jsep: jsep });
      },
      error: (error: Error) => {
        console.error("Error creating SDP answer", error);
        if (options.onError) options.onError(error);
      }
    });
  }
};

/**
 * Start watching a stream
 */
export const watchStream = (streamId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!streaming) {
      reject(new Error("Janus not initialized"));
      return;
    }

    const watch = {
      request: "watch",
      id: parseInt(streamId)
    };
    
    streaming.send({
      message: watch,
      success: () => {
        resolve();
      },
      error: (error: Error) => {
        console.error("Error watching stream", error);
        reject(error);
      }
    });
  });
};

/**
 * Start broadcasting a stream
 */
export const startBroadcast = (streamId: string, stream: MediaStream): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!streaming) {
      reject(new Error("Janus not initialized"));
      return;
    }

    // Create a new mountpoint for broadcasting
    const create = {
      request: "create",
      type: "rtp",
      name: `Stream ${streamId}`,
      description: `Stream created by user for ID ${streamId}`,
      audio: true,
      video: true,
      permanent: false
    };

    streaming.send({
      message: create,
      success: (result: unknown) => {
        const resultObj = result as { stream: { id: string } };
        const streamId = resultObj.stream.id;
        console.log(`Stream created with ID ${streamId}`);
        
        // Now start streaming
        streaming?.createOffer({
          stream: stream,
          success: (jsep: unknown) => {
            const body = { 
              request: "start",
              room: streamId
            };
            streaming?.send({
              message: body,
              jsep: jsep,
              success: () => {
                resolve();
              },
              error: (error: Error) => {
                console.error("Error starting broadcast", error);
                reject(error);
              }
            });
          },
          error: (error: Error) => {
            console.error("Error creating offer", error);
            reject(error);
          }
        });
      },
      error: (error: Error) => {
        console.error("Error creating stream", error);
        reject(error);
      }
    });
  });
};

/**
 * Stop watching a stream
 */
export const stopWatching = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!streaming) {
      resolve();
      return;
    }

    const stop = { request: "stop" };
    streaming.send({
      message: stop,
      success: () => {
        resolve();
      },
      error: (error: Error) => {
        console.error("Error stopping stream", error);
        reject(error);
      }
    });
  });
};

/**
 * Stop broadcasting
 */
export const stopBroadcast = (streamId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!streaming) {
      resolve();
      return;
    }

    const destroy = {
      request: "destroy",
      id: parseInt(streamId)
    };
    
    streaming.send({
      message: destroy,
      success: () => {
        resolve();
      },
      error: (error: Error) => {
        console.error("Error destroying stream", error);
        reject(error);
      }
    });
  });
};

/**
 * Clean up Janus resources
 */
export const cleanupJanus = (): void => {
  if (streaming) {
    streaming.detach();
    streaming = null;
  }
  
  if (janus) {
    janus.destroy();
    janus = null;
  }
};
