class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduced to stop infinite loops
  private reconnectDelay = 3000; // Increased delay
  private url: string;
  private isAuthenticated = false;
  private isWsAuthenticated = false;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private connectionHandlers: Array<(connected: boolean) => void> = [];
  private messageQueue: any[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log("Connecting to WebSocket...");
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.notifyConnectionHandlers(true);
          this.flushQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected', event.code, event.reason);
          this.isWsAuthenticated = false;
          this.notifyConnectionHandlers(false);

          // More conservative reconnection - only for network errors
          if (event.code !== 1000 && 
              event.code !== 1001 && 
              this.reconnectAttempts < this.maxReconnectAttempts) {
            
            console.log(`Will attempt reconnect in ${this.reconnectDelay}ms...`);
            this.scheduleReconnect();
          } else {
            console.log('Not reconnecting - normal close or max attempts reached');
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private scheduleReconnect() {
    // Clear existing timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect()
        .then(() => {
          // Only re-authenticate if we have stored credentials and connection is successful
          const token = localStorage.getItem('admin_token');
          if (token) {
            console.log('Re-authenticating after reconnect');
            this.send({ type: 'authenticate', payload: { token } });
          }
        })
        .catch((error) => {
          console.error('Reconnection failed:', error);
        });
    }, this.reconnectDelay);
  }

  private flushQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const msg = this.messageQueue.shift();
      this.ws?.send(JSON.stringify(msg));
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not ready, queuing message:', message.type);
      this.messageQueue.push(message);
    }
  }

  private handleMessage(message: any) {
    const { type, ...data } = message;
    
    // Handle authentication success
    if (type === 'auth_success') {
      this.isAuthenticated = true;
      this.isWsAuthenticated = true;
      if (data.user?.token) {
        localStorage.setItem('admin_token', data.user.token);
      }
    }

    // Handle errors
    if (type === 'error' && data.message?.includes('authentication')) {
      console.error('Authentication error:', data.message);
      this.isAuthenticated = false;
      this.isWsAuthenticated = false;
    }

    // Notify registered handlers
    const handler = this.messageHandlers.get(type);
    if (handler) {
      handler(data);
    }

    // Notify all handlers for debugging
    const allHandler = this.messageHandlers.get('*');
    if (allHandler) {
      allHandler(message);
    }
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach(handler => handler(connected));
  }

  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  onConnection(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);
  }

  authenticate(email: string, password: string) {
    this.send({
      type: 'authenticate',
      payload: { email, password }
    });
  }

  // Add method for token-based authentication
  authenticateWithToken(token: string) {
    console.log('Authenticating with token');
    this.send({
      type: 'authenticate',
      payload: { token }
    });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  isAuth(): boolean {
    return this.isAuthenticated;
  }

  disconnect() {
    console.log('Disconnecting WebSocket');
    
    // Clear reconnect timer to prevent reconnection after manual disconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
      this.isWsAuthenticated = false;
    }
  }
}

const wsUrl =
  process.env.NODE_ENV === "development"
    ? "ws://localhost:8000/admin/ws"
    : "wss://smartbag-backend-oqlt.onrender.com/admin/ws";

export const wsService = new WebSocketService(wsUrl);