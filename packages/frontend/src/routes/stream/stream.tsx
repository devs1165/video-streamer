import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import JanusPlayer from "../../lib/components/JanusPlayer";

interface JanusError extends Error {
  type?: "offline" | "access-control" | "fallback" | "permissions" | "unknown";
}

export const Stream = () => {
  const { id: playbackId } = useParams();
  const [toggleError, setToggelError] = useState(false);
  const [errorType, setErrorType] = useState<
    | "offline"
    | "access-control"
    | "fallback"
    | "permissions"
    | "unknown"
    | undefined
  >(undefined);

  // Get the Janus server URL from environment variables or use a default
  const janusServer = import.meta.env.VITE_JANUS_SERVER_URL || 'http://localhost:8088/janus';

  return (
    <div className="p-4">
      {toggleError ? (
        <div className="grid place-content-center w-full h-screen">
          {errorType === "offline" ? (
            <div>
              <div className="h-[120px] w-full sm:flex hidden text-primary-white">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p>This livestream is currently offline now</p>
            </div>
          ) : errorType === "access-control" ? (
            "Sorry you do not have access to view this livestream"
          ) : (
            "An error occurred while fetching livestream, please try again later"
          )}
        </div>
      ) : (
        <div style={{ height: "100%", width: "100%", overflow: "hidden", backgroundColor: "black" }}>
          <JanusPlayer
            playbackId={playbackId || ''}
            janusServer={janusServer}
            autoPlay={true}
            onError={(error: JanusError) => {
              console.error("Janus player error:", error);
              if (error.message?.includes("offline")) {
                setErrorType("offline");
              } else if (error.message?.includes("access")) {
                setErrorType("access-control");
              } else {
                setErrorType(error.type || "unknown");
              }
              setToggelError(true);
              toast.error(`Error: ${error.message || "Unknown error"}`);
            }}
            style={{ height: "100%", width: "100%" }}
          />
        </div>
      )}
    </div>
  );
};
