import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { wsService } from "@/services/websocket";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  MessageCircle, 
  HelpCircle, 
  Send,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Eye,
  Edit,
  X
} from "lucide-react";
import { format } from "date-fns";

interface TicketMessage {
  _id: string;
  message: string;
  sender_type: 'user' | 'admin' | 'system';
  sender_name: string;
  sender_id: string;
  created_at: string;
  attachments?: string[];
}

interface HelpTicket {
  _id: string;
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  message: string;
  user_name: string;
  user_email: string;
  user_phone?: string;
  created_at: string;
  updated_at: string;
  admin_response?: string;
  responded_at?: string;
  messages?: TicketMessage[];
  message_count?: number;
  latest_message?: {
    message: string;
    sender_type: string;
    created_at: string;
  };
  user_info?: {
    name: string;
    email: string;
    phone: string;
    role: string;
    created_at?: string;
  };
}

interface TicketStats {
  total_tickets: number;
  today_tickets: number;
  status_breakdown: {
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
}

export default function HelpSupport() {
  const { toast } = useToast();
  const [helpTickets, setHelpTickets] = useState<HelpTicket[]>([]);
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<HelpTicket | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const statusOptions = [
    { value: "all", label: "All Tickets" },
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
  ];

  const priorityOptions = [
    { value: "all", label: "All Priorities" },
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
  ];

  const priorityColors = {
    low: "secondary",
    medium: "default", 
    high: "destructive",
    urgent: "destructive"
  } as const;

  const statusColors = {
    open: "destructive",
    in_progress: "default",
    resolved: "secondary",
    closed: "outline"
  } as const;

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (selectedTicket?.messages) {
      setTimeout(scrollToBottom, 100);
    }
  }, [selectedTicket?.messages]);

  // Request initial data and set up real-time handlers
  useEffect(() => {
    console.log('Help & Support component mounted');
    
    // Request tickets and stats
    wsService.send({
      type: 'get_help_tickets',
      filters: { status: statusFilter, priority: priorityFilter }
    });
    
    wsService.send({
      type: 'get_ticket_stats',
      filters: {}
    });

    const handleHelpTicketsData = (data: any) => {
      console.log('Received help tickets data:', data);
      setHelpTickets(data.tickets || []);
      setIsLoading(false);
    };

    const handleTicketStatsData = (data: any) => {
      console.log('Received ticket stats:', data);
      setTicketStats(data.stats);
    };

    const handleTicketDetailData = (data: any) => {
      console.log('Received ticket detail:', data);
      setSelectedTicket(data.ticket);
    };

    const handleTicketUpdated = (data: any) => {
      console.log('Ticket updated:', data);
      
      // Refresh tickets list
      wsService.send({ 
        type: 'get_help_tickets', 
        filters: { status: statusFilter, priority: priorityFilter }
      });
      
      // Refresh ticket detail if modal is open
      if (selectedTicket && data.ticket_id === selectedTicket._id) {
        wsService.send({
          type: 'get_ticket_detail',
          ticket_id: data.ticket_id
        });
      }
      
      setIsResponding(false);
      setAdminResponse("");
      
      toast({
        title: "Response Sent",
        description: "Your response has been sent to the user",
      });
    };

    const handleError = (data: any) => {
      console.error('Help & Support WebSocket error:', data);
      setIsLoading(false);
      setIsResponding(false);
      
      if (!data.message?.includes('Unknown message type') && 
          !data.message?.includes('not implemented')) {
        toast({
          title: "Error",
          description: data.message || "An error occurred",
          variant: "destructive",
        });
      }
    };

    // Register message handlers
    wsService.onMessage("help_tickets_data", handleHelpTicketsData);
    wsService.onMessage("ticket_stats_data", handleTicketStatsData);
    wsService.onMessage("ticket_detail_data", handleTicketDetailData);
    wsService.onMessage("ticket_updated", handleTicketUpdated);
    wsService.onMessage("error", handleError);

    // Auto-refresh interval
    let refreshInterval: NodeJS.Timeout;
    if (autoRefresh) {
      refreshInterval = setInterval(() => {
        wsService.send({
          type: 'get_help_tickets',
          filters: { status: statusFilter, priority: priorityFilter }
        });
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      wsService.onMessage("help_tickets_data", () => {});
      wsService.onMessage("ticket_stats_data", () => {});
      wsService.onMessage("ticket_detail_data", () => {});
      wsService.onMessage("ticket_updated", () => {});
      wsService.onMessage("error", () => {});
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [toast, statusFilter, priorityFilter, autoRefresh, selectedTicket]);

  const filteredTickets = helpTickets.filter(ticket => {
    const searchTerm = searchQuery.toLowerCase();
    const matchesSearch = (ticket.subject || '').toLowerCase().includes(searchTerm) ||
                         (ticket.user_name || '').toLowerCase().includes(searchTerm) ||
                         (ticket._id || '').toLowerCase().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const openTicketDetail = (ticket: HelpTicket) => {
    setSelectedTicket(ticket);
    setSelectedStatus(ticket.status);
    setAdminResponse("");
    setShowTicketModal(true);
    
    // Fetch detailed ticket information
    wsService.send({
      type: 'get_ticket_detail',
      ticket_id: ticket._id
    });
  };

  const handleResponseSubmit = () => {
    if (!selectedTicket || !adminResponse.trim()) {
      toast({
        title: "Error",
        description: "Please provide a response",
        variant: "destructive",
      });
      return;
    }

    setIsResponding(true);

    wsService.send({
      type: 'respond_to_ticket',
      data: {
        ticket_id: selectedTicket._id,
        response: adminResponse,
        status: selectedStatus || 'in_progress'
      }
    });

    toast({
      title: "Sending Response",
      description: "Sending response to user...",
    });
  };

  const handleStatusChange = (newStatus: string) => {
    if (!selectedTicket) return;
    
    setSelectedStatus(newStatus);
    
    wsService.send({
      type: 'update_ticket_status',
      data: {
        ticket_id: selectedTicket._id,
        status: newStatus,
        admin_note: `Status changed to ${newStatus} by admin`
      }
    });

    toast({
      title: "Updating Status",
      description: `Changing ticket status to ${newStatus}...`,
    });
  };

  const refreshData = () => {
    setIsLoading(true);
    wsService.send({
      type: 'get_help_tickets',
      filters: { status: statusFilter, priority: priorityFilter }
    });
    wsService.send({
      type: 'get_ticket_stats',
      filters: {}
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <HelpCircle className="h-4 w-4" />;
    }
  };

  const renderMessage = (message: TicketMessage, index: number) => {
    const isAdminMessage = message.sender_type === 'admin';
    const isSystemMessage = message.sender_type === 'system';
    
    return (
      <div
        key={message._id || index}
        className={`p-4 rounded-lg mb-3 ${
          isAdminMessage 
            ? 'bg-blue-50 border-l-4 border-blue-500 ml-8' 
            : isSystemMessage
            ? 'bg-gray-50 border-l-4 border-gray-400'
            : 'bg-white border-l-4 border-orange-500 mr-8'
        }`}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            {isAdminMessage && <Badge variant="default">Admin</Badge>}
            {isSystemMessage && <Badge variant="outline">System</Badge>}
            {!isAdminMessage && !isSystemMessage && <Badge variant="secondary">User</Badge>}
            <span className="font-medium text-sm">
              {message.sender_name}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), "MMM dd, HH:mm")}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{message.message}</p>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <HelpCircle className="h-8 w-8" />
            Help & Support
          </h1>
          <p className="text-muted-foreground">Manage customer support tickets and provide assistance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Clock className="h-4 w-4 mr-2" />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>

      {/* Support Overview Cards */}
      {ticketStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketStats.total_tickets}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {ticketStats.status_breakdown.open}
              </div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {ticketStats.status_breakdown.in_progress}
              </div>
              <p className="text-xs text-muted-foreground">Being handled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Tickets</CardTitle>
              <Calendar className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {ticketStats.today_tickets}
              </div>
              <p className="text-xs text-muted-foreground">New today</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Support Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
          <CardDescription>
            {isLoading ? "Loading tickets..." : `${filteredTickets.length} tickets found`}
          </CardDescription>
          <div className="flex items-center space-x-4 flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
                disabled={isLoading}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter} disabled={isLoading}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter} disabled={isLoading}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tickets...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length > 0 ? filteredTickets.map((ticket) => (
                  <TableRow key={ticket._id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">
                      #{ticket._id.slice(-6)}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={ticket.subject}>
                        {ticket.subject}
                      </div>
                      {ticket.latest_message && (
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          Latest: {ticket.latest_message.message.substring(0, 50)}...
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{ticket.user_name}</div>
                          <div className="text-xs text-muted-foreground">{ticket.user_email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={priorityColors[ticket.priority as keyof typeof priorityColors] || "default"}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(ticket.status)}
                        <Badge variant={statusColors[ticket.status as keyof typeof statusColors] || "default"}>
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{ticket.message_count || 0}</span>
                        {ticket.latest_message?.sender_type === 'user' && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full ml-1" title="New user message" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(ticket.created_at), "MMM dd")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(ticket.created_at), "HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTicketDetail(ticket)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {ticket.status === 'open' && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              wsService.send({
                                type: 'update_ticket_status',
                                data: {
                                  ticket_id: ticket._id,
                                  status: 'in_progress'
                                }
                              });
                            }}
                          >
                            Start
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No support tickets found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Ticket Detail Modal */}
      <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle>Support Ticket Details</DialogTitle>
                <DialogDescription>
                  #{selectedTicket?._id?.slice(-8)} - {selectedTicket?.subject}
                </DialogDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowTicketModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="flex-1 flex gap-4 overflow-hidden">
              {/* Left Panel - Ticket Info */}
              <div className="w-1/3 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Name</p>
                      <p className="text-sm text-muted-foreground">{selectedTicket.user_info?.name || selectedTicket.user_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{selectedTicket.user_info?.email || selectedTicket.user_email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{selectedTicket.user_info?.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Account Type</p>
                      <Badge variant="outline">{selectedTicket.user_info?.role || 'user'}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Ticket Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Category</p>
                      <Badge variant="outline">{selectedTicket.category.replace('_', ' ')}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Priority</p>
                      <Badge variant={priorityColors[selectedTicket.priority as keyof typeof priorityColors]}>
                        {selectedTicket.priority}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Current Status</p>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedTicket.created_at), "MMM dd, yyyy HH:mm")}
                      </p>
                    </div>
                    {selectedTicket.order_id && (
                      <div>
                        <p className="text-sm font-medium">Related Order</p>
                        <p className="text-sm text-muted-foreground">{selectedTicket.order_id}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => handleStatusChange(selectedStatus)}
                  disabled={selectedStatus === selectedTicket.status}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Update Status
                </Button>
              </div>

              {/* Right Panel - Messages */}
              <div className="flex-1 flex flex-col">
                <Card className="flex-1 flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Conversation History
                    </CardTitle>
                    <CardDescription>
                      Full conversation between customer and support team
                    </CardDescription>
                  </CardHeader>
                  
                  {/* Messages Container */}
                  <CardContent className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: '300px' }}>
                      {/* Original ticket message */}
                      <div className="p-4 rounded-lg mb-3 bg-amber-50 border-l-4 border-amber-500">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Original Request</Badge>
                            <span className="font-medium text-sm">{selectedTicket.user_name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(selectedTicket.created_at), "MMM dd, HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{selectedTicket.message}</p>
                      </div>

                      {/* Additional messages */}
                      {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                        selectedTicket.messages.map((message, index) => renderMessage(message, index))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No additional messages yet</p>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Response Form */}
                    <div className="border-t pt-4 mt-4">
                      <div className="space-y-3">
                        <Label htmlFor="admin-response">Your Response</Label>
                        <Textarea
                          id="admin-response"
                          placeholder="Type your response to the customer..."
                          value={adminResponse}
                          onChange={(e) => setAdminResponse(e.target.value)}
                          rows={4}
                          disabled={isResponding}
                          className="resize-none"
                        />
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-muted-foreground">
                            {adminResponse.length}/2000 characters
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setAdminResponse("")}
                              disabled={isResponding || !adminResponse}
                            >
                              Clear
                            </Button>
                            <Button 
                              onClick={handleResponseSubmit}
                              disabled={isResponding || !adminResponse.trim()}
                              size="sm"
                            >
                              {isResponding ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Send Response
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}