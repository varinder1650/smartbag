// class WebSocketService {
//   private ws: WebSocket | null = null;
//   private reconnectAttempts = 0;
//   private maxReconnectAttempts = 5;
//   private reconnectDelay = 1000;
//   private url: string;
//   private isAuthenticated = false;
//   private isWsAuthenticated = false;
//   private messageHandlers: Map<string, (data: any) => void> = new Map();
//   private connectionHandlers: Array<(connected: boolean) => void> = [];

//   constructor(url: string) {
//     this.url = url;
//   }

//   connect(): Promise<void> {
//     return new Promise((resolve, reject) => {
//       try {
//         this.ws = new WebSocket(this.url);

//         this.ws.onopen = () => {
//           console.log('WebSocket connected');
//           this.reconnectAttempts = 0;
//           this.notifyConnectionHandlers(true);
//           resolve();
//         };

//         this.ws.onmessage = (event) => {
//           try {
//             const message = JSON.parse(event.data);
//             this.handleMessage(message);
//           } catch (error) {
//             console.error('Failed to parse WebSocket message:', error);
//           }
//         };

//         this.ws.onclose = (event) => {
//           console.log('WebSocket disconnected', event.code, event.reason);
//           this.isAuthenticated = false;
//           this.notifyConnectionHandlers(false);
          
//           // Only attempt reconnect if it wasn't a normal closure
//           if (event.code !== 1000) {
//             this.attemptReconnect();
//           }
//         };

//         this.ws.onerror = (error) => {
//           console.error('WebSocket error:', error);
//           reject(error);
//         };
//       } catch (error) {
//         reject(error);
//       }
//     });
//   }

//   private handleMessage(message: any) {
//     const { type, ...data } = message;
    
//     // Handle authentication success
//     if (type === 'auth_success') {
//       this.isAuthenticated = true;
//       this.isWsAuthenticated = true;
//       localStorage.setItem('admin_token', data.user.token);
//     }

//     // Notify registered handlers
//     const handler = this.messageHandlers.get(type);
//     if (handler) {
//       handler(data);
//     }

//     // Notify all handlers for debugging
//     const allHandler = this.messageHandlers.get('*');
//     if (allHandler) {
//       allHandler(message);
//     }
//   }

//   private attemptReconnect() {
//     if (this.reconnectAttempts < this.maxReconnectAttempts) {
//       this.reconnectAttempts++;
//       console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
//       setTimeout(() => {
//         this.connect().catch((error) => {
//           console.error('Reconnection failed:', error);
//           if (this.reconnectAttempts >= this.maxReconnectAttempts) {
//             console.log('Max reconnection attempts reached. Stopping reconnection.');
//             this.notifyConnectionHandlers(false);
//           }
//         });
//       }, this.reconnectDelay * this.reconnectAttempts);
//     } else {
//       console.log('Max reconnection attempts reached. Giving up.');
//       this.notifyConnectionHandlers(false);
//     }
//   }

//   private notifyConnectionHandlers(connected: boolean) {
//     this.connectionHandlers.forEach(handler => handler(connected));
//   }

//   send(message: any) {
//     if (this.ws && this.ws.readyState === WebSocket.OPEN) {
//       if (!this.isWsAuthenticated && message.type !== 'authenticate') {
//         console.warn('WebSocket is not authenticated. Message blocked:', message);
//         return;
//       }
//       this.ws.send(JSON.stringify(message));
//     } else {
//       console.error('WebSocket is not connected');
//     }
//   }

//   onMessage(type: string, handler: (data: any) => void) {
//     this.messageHandlers.set(type, handler);
//   }

//   onConnection(handler: (connected: boolean) => void) {
//     this.connectionHandlers.push(handler);
//   }

//   async connectAndAuthenticate(email: string, password: string): Promise<void> {
//     if (this.ws && this.ws.readyState === WebSocket.OPEN) {
//       this.authenticate(email, password);
//       return;
//     }

//     await this.connect();
//     this.authenticate(email, password);
//   }

//   authenticate(email: string, password: string) {
//     this.send({
//       type: 'authenticate',
//       payload: {
//         email,
//         password,
//       },
//     });
//   }

//   subscribe(channel: string) {
//     console.log(channel)
//     this.send({
//       type: 'subscribe',
//       channel
//     });
//   }

//   isConnected(): boolean {
//     return this.ws?.readyState === WebSocket.OPEN;
//   }

//   isAuth(): boolean {
//     return this.isAuthenticated;
//   }

//   disconnect() {
//     if (this.ws) {
//       this.ws.close();
//       this.ws = null;
//       this.isWsAuthenticated = false;
//     }
//   }
// }

// // Create singleton instance
// export const wsService = new WebSocketService('ws://localhost:8000/admin/ws');

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private url: string;
  private isAuthenticated = false;
  private isWsAuthenticated = false;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private connectionHandlers: Array<(connected: boolean) => void> = [];
  private messageQueue: any[] = []; // 👈 add a queue

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.notifyConnectionHandlers(true);

          // 👇 flush queued messages
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
          this.isAuthenticated = false;
          this.notifyConnectionHandlers(false);

          if (event.code !== 1000) {
            this.attemptReconnect();
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

  private flushQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const msg = this.messageQueue.shift();
      this.ws?.send(JSON.stringify(msg));
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (!this.isWsAuthenticated && message.type !== 'authenticate') {
        console.warn('WebSocket is not authenticated. Message blocked:', message);
        return;
      }
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not ready, queuing message:', message);
      this.messageQueue.push(message); // 👈 queue instead of error
    }
  }
  private handleMessage(message: any) {
    const { type, ...data } = message;
    
    // Handle authentication success
    if (type === 'auth_success') {
      this.isAuthenticated = true;
      this.isWsAuthenticated = true;
      localStorage.setItem('admin_token', data.user.token);
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

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached. Stopping reconnection.');
            this.notifyConnectionHandlers(false);
          }
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.log('Max reconnection attempts reached. Giving up.');
      this.notifyConnectionHandlers(false);
    }
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach(handler => handler(connected));
  }

  // send(message: any) {
  //   if (this.ws && this.ws.readyState === WebSocket.OPEN) {
  //     if (!this.isWsAuthenticated && message.type !== 'authenticate') {
  //       console.warn('WebSocket is not authenticated. Message blocked:', message);
  //       return;
  //     }
  //     this.ws.send(JSON.stringify(message));
  //   } else {
  //     console.error('WebSocket is not connected');
  //   }
  // }

  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  onConnection(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);
  }

  async connectAndAuthenticate(email: string, password: string): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.authenticate(email, password);
      return;
    }

    await this.connect();
    this.authenticate(email, password);
  }

  authenticate(email: string, password: string) {
    this.send({
      type: 'authenticate',
      payload: {
        email,
        password,
      },
    });
  }

  subscribe(channel: string) {
    console.log(channel)
    this.send({
      type: 'subscribe',
      channel
    });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  isAuth(): boolean {
    return this.isAuthenticated;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isWsAuthenticated = false;
    }
  }
}

// Create singleton instance
export const wsService = new WebSocketService('ws://localhost:8000/admin/ws');