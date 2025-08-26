// // import { useState, useEffect } from "react";
// // import { useNavigate } from "react-router-dom";
// // import { Button } from "@/components/ui/button";
// // import { Input } from "@/components/ui/input";
// // import { Label } from "@/components/ui/label";
// // import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// // import { useAuthStore } from "@/store/authStore";
// // import { wsService } from "@/services/websocket";
// // import { useToast } from "@/hooks/use-toast";
// // import { Loader2, Eye, EyeOff } from "lucide-react";

// // export default function Login() {
// //   const [email, setEmail] = useState("");
// //   const [password, setPassword] = useState("");
// //   const [showPassword, setShowPassword] = useState(false);
// //   const { isLoading, setLoading, setUser, setError, isAuthenticated } = useAuthStore();
// //   const { toast } = useToast();
// //   const navigate = useNavigate();

// //   useEffect(() => {
// //     if (isAuthenticated) {
// //       navigate("/dashboard");
// //     }
// //   }, [isAuthenticated, navigate]);

// //   useEffect(() => {
// //     const handleAuthSuccess = (data: any) => {
// //       setLoading(false);
// //       setUser(data.user);
// //       toast({
// //         title: "Login Successful",
// //         description: `Welcome back, ${data.user.name}!`,
// //       });
// //       navigate("/dashboard");
// //     };

// //     const handleAuthError = (data: any) => {
// //       setLoading(false);
// //       setError(data.message);
// //       toast({
// //         title: "Login Failed",
// //         description: data.message || "Invalid credentials",
// //         variant: "destructive",
// //       });
// //     };

// //     wsService.onMessage('auth_success', handleAuthSuccess);
// //     wsService.onMessage('error', handleAuthError);

// //     return () => {
// //       // Cleanup listeners when component unmounts
// //       wsService.onMessage('auth_success', () => {});
// //       wsService.onMessage('error', () => {});
// //     };
// //   }, [setLoading, setUser, setError, toast, navigate]);

// //   const handleSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
    
// //     if (!email || !password) {
// //       toast({
// //         title: "Validation Error",
// //         description: "Please fill in all fields",
// //         variant: "destructive",
// //       });
// //       return;
// //     }

// //     setLoading(true);
// //     setError(null);

// //     wsService.authenticate(email, password);
// //   };

// //   return (
// //     <div className="min-h-screen flex items-center justify-center bg-background p-4">
// //       <Card className="w-full max-w-md">
// //         <CardHeader className="text-center">
// //           <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
// //           <CardDescription>
// //             Enter your credentials to access the admin dashboard
// //           </CardDescription>
// //         </CardHeader>
// //         <CardContent>
// //           <form onSubmit={handleSubmit} className="space-y-4">
// //             <div className="space-y-2">
// //               <Label htmlFor="email">Email</Label>
// //               <Input
// //                 id="email"
// //                 type="email"
// //                 placeholder="admin@example.com"
// //                 value={email}
// //                 onChange={(e) => setEmail(e.target.value)}
// //                 disabled={isLoading}
// //                 required
// //               />
// //             </div>
// //             <div className="space-y-2">
// //               <Label htmlFor="password">Password</Label>
// //               <div className="relative">
// //                 <Input
// //                   id="password"
// //                   type={showPassword ? "text" : "password"}
// //                   placeholder="Enter your password"
// //                   value={password}
// //                   onChange={(e) => setPassword(e.target.value)}
// //                   disabled={isLoading}
// //                   required
// //                 />
// //                 <Button
// //                   type="button"
// //                   variant="ghost"
// //                   size="sm"
// //                   className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
// //                   onClick={() => setShowPassword(!showPassword)}
// //                   disabled={isLoading}
// //                 >
// //                   {showPassword ? (
// //                     <EyeOff className="h-4 w-4" />
// //                   ) : (
// //                     <Eye className="h-4 w-4" />
// //                   )}
// //                 </Button>
// //               </div>
// //             </div>
// //             <Button type="submit" className="w-full" disabled={isLoading}>
// //               {isLoading ? (
// //                 <>
// //                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
// //                   Signing in...
// //                 </>
// //               ) : (
// //                 "Sign In"
// //               )}
// //             </Button>
// //           </form>
// //         </CardContent>
// //       </Card>
// //     </div>
// //   );
// // }

// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { useAuthStore } from "@/store/authStore";
// import { wsService } from "@/services/websocket";
// import { useToast } from "@/hooks/use-toast";
// import { Loader2, Eye, EyeOff } from "lucide-react";

// export default function Login() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const { isLoading, setLoading, setUser, setError, isAuthenticated } = useAuthStore();
//   const { toast } = useToast();
//   const navigate = useNavigate();

//   // Redirect if already authenticated
//   useEffect(() => {
//     if (isAuthenticated) {
//       console.log('User already authenticated, redirecting to dashboard');
//       navigate("/dashboard", { replace: true });
//     }
//   }, [isAuthenticated, navigate]);

//   // Set up WebSocket message handlers
//   useEffect(() => {
//     let isHandlerActive = true;

//     const handleAuthSuccess = (data: any) => {
//       if (!isHandlerActive) return;
      
//       console.log('Login successful:', data);
//       setLoading(false);
      
//       if (data.user) {
//         setUser(data.user);
//         toast({
//           title: "Login Successful",
//           description: `Welcome back, ${data.user.name}!`,
//         });
//         navigate("/dashboard", { replace: true });
//       }
//     };

//     const handleAuthError = (data: any) => {
//       if (!isHandlerActive) return;
      
//       console.error('Login failed:', data);
//       setLoading(false);
//       const errorMessage = data.message || "Invalid credentials";
//       setError(errorMessage);
//       toast({
//         title: "Login Failed",
//         description: errorMessage,
//         variant: "destructive",
//       });
//     };

//     // Register handlers
//     wsService.onMessage('auth_success', handleAuthSuccess);
//     wsService.onMessage('error', handleAuthError);

//     // Cleanup function
//     return () => {
//       isHandlerActive = false;
//       // Clear handlers by setting empty functions
//       wsService.onMessage('auth_success', () => {});
//       wsService.onMessage('error', () => {});
//     };
//   }, [setLoading, setUser, setError, toast, navigate]);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (!email || !password) {
//       toast({
//         title: "Validation Error",
//         description: "Please fill in all fields",
//         variant: "destructive",
//       });
//       return;
//     }

//     console.log('Starting login process...');
//     setLoading(true);
//     setError(null);

//     try {
//       // Ensure WebSocket is connected before attempting authentication
//       if (!wsService.isConnected()) {
//         console.log('WebSocket not connected, connecting first...');
//         await wsService.connect();
//       }

//       // Send authentication request
//       wsService.authenticate(email, password);
      
//       // Set a timeout to handle cases where server doesn't respond
//       setTimeout(() => {
//         if (isLoading) {
//           console.error('Login timeout - no response from server');
//           setLoading(false);
//           setError('Login timeout - please try again');
//           toast({
//             title: "Connection Timeout",
//             description: "Please check your connection and try again",
//             variant: "destructive",
//           });
//         }
//       }, 10000); // 10 second timeout
      
//     } catch (error) {
//       console.error('Error during login:', error);
//       setLoading(false);
//       setError('Connection failed');
//       toast({
//         title: "Connection Error",
//         description: "Failed to connect to server. Please try again.",
//         variant: "destructive",
//       });
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-background p-4">
//       <Card className="w-full max-w-md">
//         <CardHeader className="text-center">
//           <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
//           <CardDescription>
//             Enter your credentials to access the admin dashboard
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div className="space-y-2">
//               <Label htmlFor="email">Email</Label>
//               <Input
//                 id="email"
//                 type="email"
//                 placeholder="admin@example.com"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 disabled={isLoading}
//                 required
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="password">Password</Label>
//               <div className="relative">
//                 <Input
//                   id="password"
//                   type={showPassword ? "text" : "password"}
//                   placeholder="Enter your password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   disabled={isLoading}
//                   required
//                 />
//                 <Button
//                   type="button"
//                   variant="ghost"
//                   size="sm"
//                   className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
//                   onClick={() => setShowPassword(!showPassword)}
//                   disabled={isLoading}
//                 >
//                   {showPassword ? (
//                     <EyeOff className="h-4 w-4" />
//                   ) : (
//                     <Eye className="h-4 w-4" />
//                   )}
//                 </Button>
//               </div>
//             </div>
//             <Button type="submit" className="w-full" disabled={isLoading}>
//               {isLoading ? (
//                 <>
//                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                   Signing in...
//                 </>
//               ) : (
//                 "Sign In"
//               )}
//             </Button>
//           </form>
          
//           {/* Connection Status for debugging */}
//           <div className="mt-4 text-xs text-center text-muted-foreground">
//             WebSocket: {wsService.isConnected() ? 'Connected' : 'Disconnected'}
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { wsService } from "@/services/websocket";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { isLoading, setLoading, setUser, setError, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('User already authenticated, redirecting to dashboard');
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Set up WebSocket message handlers
  useEffect(() => {
    let isHandlerActive = true;

    const handleAuthSuccess = (data: any) => {
      if (!isHandlerActive) return;
      
      console.log('Login successful:', data);
      setLoading(false);
      
      if (data.user) {
        setUser(data.user);
        toast({
          title: "Login Successful",
          description: `Welcome back, ${data.user.name}!`,
        });
        navigate("/dashboard", { replace: true });
      }
    };

    const handleAuthError = (data: any) => {
      if (!isHandlerActive) return;
      
      console.error('Login failed:', data);
      setLoading(false);
      const errorMessage = data.message || "Invalid credentials";
      setError(errorMessage);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    };

    // Register handlers
    wsService.onMessage('auth_success', handleAuthSuccess);
    wsService.onMessage('error', handleAuthError);

    // Cleanup function
    return () => {
      isHandlerActive = false;
      // Clear handlers by setting empty functions
      wsService.onMessage('auth_success', () => {});
      wsService.onMessage('error', () => {});
    };
  }, [setLoading, setUser, setError, toast, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting login process...');
    setLoading(true);
    setError(null);

    try {
      // Ensure WebSocket is connected before attempting authentication
      if (!wsService.isConnected()) {
        console.log('Connecting WebSocket for login...');
        await wsService.connect();
      }

      // Send authentication request
      console.log('Sending authentication request...');
      wsService.authenticate(email, password);
      
    } catch (error) {
      console.error('Error during login setup:', error);
      setLoading(false);
      setError('Connection failed');
      toast({
        title: "Connection Error",
        description: "Failed to connect to server. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
          
          {/* Connection Status for debugging */}
          <div className="mt-4 text-xs text-center text-muted-foreground">
            WebSocket: {wsService.isConnected() ? 'Connected' : 'Disconnected'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}