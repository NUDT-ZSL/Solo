import { useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import Home from "@/pages/Home";
import Player from "@/pages/Player";

export default function App() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(window.location.origin, {
      transports: ["websocket", "polling"],
    });

    socketRef.current.on("connect", () => {
      console.log("Socket.io connected:", socketRef.current?.id);
    });

    socketRef.current.on("disconnect", () => {
      console.log("Socket.io disconnected");
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/podcast/:id" element={<Player socket={socketRef.current} />} />
        </Routes>
      </Router>
    </div>
  );
}
