// SOCKET-INTEGRATION: Widget flotante de chat
import React from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, MessageCircle, Send } from "lucide-react";

type Msg = { user: string; text: string; ts: number; id?: string };

export function ChatWidget({ currentUser }: { currentUser?: string }) {
  const [open, setOpen] = React.useState(false);
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [text, setText] = React.useState("");
  const [connected, setConnected] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [msgs]);

  React.useEffect(() => {
    const s = io("/", { withCredentials: true });
    setSocket(s);

    s.on("connect", () => {
      console.log("Conectado al chat");
      setConnected(true);
    });

    s.on("disconnect", () => {
      console.log("Desconectado del chat");
      setConnected(false);
    });

    s.on("chat:message", (m: Msg) => {
      setMsgs((prev) => [...prev.slice(-99), m]); // Mantén solo los últimos 100 mensajes
    });

    return () => {
      s.off("connect");
      s.off("disconnect");
      s.off("chat:message");
      s.close();
    };
  }, []);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || !socket || !connected) return;
    
    socket.emit("chat:message", {
      user: currentUser || "Usuario",
      text: trimmed,
    });
    setText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Widget flotante */}
      {open && (
        <Card className="fixed bottom-20 right-4 w-80 h-96 shadow-xl z-50 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle size={16} />
                Chat en vivo
                {connected ? (
                  <Badge variant="secondary" className="text-xs">En línea</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">Desconectado</Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                data-testid="button-close-chat"
              >
                <X size={16} />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-3">
            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto mb-3 space-y-2 max-h-64">
              {msgs.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-4">
                  No hay mensajes aún
                </div>
              ) : (
                msgs.map((msg, idx) => (
                  <div
                    key={`${msg.ts}-${idx}`}
                    className={`text-sm p-2 rounded max-w-[90%] ${
                      msg.user === currentUser
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-muted mr-auto"
                    }`}
                  >
                    <div className="font-medium text-xs opacity-70 mb-1">
                      {msg.user}
                    </div>
                    <div className="break-words">{msg.text}</div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe un mensaje..."
                disabled={!connected}
                className="flex-1 text-sm"
                data-testid="input-chat-message"
              />
              <Button
                onClick={send}
                disabled={!connected || !text.trim()}
                size="sm"
                data-testid="button-send-message"
              >
                <Send size={14} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botón flotante */}
      <Button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 rounded-full shadow-lg p-3 z-40"
        size="sm"
        data-testid="button-toggle-chat"
      >
        <MessageCircle size={20} />
        {msgs.length > 0 && !open && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
            {msgs.length > 9 ? "9+" : msgs.length}
          </Badge>
        )}
      </Button>
    </>
  );
}