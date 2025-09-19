import { useState, useEffect } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardStore } from "@/store/dashboardStore";
import { wsService } from "@/services/websocket";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Plus, 
  MessageCircle, 
  Book, 
  HelpCircle, 
  FileQuestion, 
  Send,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

interface HelpTicket {
  _id: string;
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  user_name: string;
  user_email: string;
  created_at: string;
  updated_at: string;
  admin_response?: string;
  response_at?: string;
}

export default function HelpSupport() {
  const { toast } = useToast();
  const [helpTickets, setHelpTickets] = useState<HelpTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<HelpTicket | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false);

  const statusOptions = [
    { value: "all", label: "All Tickets" },
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
  ];

  const priorityColors = {
    low: "secondary",
    medium: "default", 
    high: "destructive",
    urgent: "destructive"
  } as const;

  // const faqData = [
  //   {
  //     category: "Orders & Delivery",
  //     items: [
  //       {
  //         question: "How do I track my order?",
  //         answer: "You can track your order by logging into your account and viewing the 'My Orders' section. You'll see real-time updates on your order status including preparation, dispatch, and delivery."
  //       },
  //       {
  //         question: "What are the delivery charges?",
  //         answer: "Delivery charges vary based on distance and order value. Orders above ₹500 qualify for free delivery within the standard delivery zone."
  //       },
  //       {
  //         question: "Can I cancel my order?",
  //         answer: "Yes, you can cancel your order within 5 minutes of placing it. After that, cancellation depends on the order status. Orders that are already being prepared cannot be cancelled."
  //       }
  //     ]
  //   },
  //   {
  //     category: "Payments & Refunds", 
  //     items: [
  //       {
  //         question: "What payment methods do you accept?",
  //         answer: "We accept all major credit/debit cards, UPI, net banking, and digital wallets like Paytm, Google Pay, and PhonePe."
  //       },
  //       {
  //         question: "How long does it take to process refunds?",
  //         answer: "Refunds are typically processed within 3-5 business days. The time may vary depending on your payment method and bank."
  //       },
  //       {
  //         question: "Why was my payment declined?",
  //         answer: "Payment can be declined due to insufficient funds, incorrect card details, network issues, or bank security measures. Please try again or use a different payment method."
  //       }
  //     ]
  //   },
  //   {
  //     category: "Account & Profile",
  //     items: [
  //       {
  //         question: "How do I reset my password?",
  //         answer: "Click on 'Forgot Password' on the login page and enter your registered email. You'll receive a password reset link within a few minutes."
  //       },
  //       {
  //         question: "Can I change my delivery address?",
  //         answer: "Yes, you can add, edit, or delete delivery addresses from your account profile. Make sure to select the correct address before placing an order."
  //       },
  //       {
  //         question: "How do I delete my account?",
  //         answer: "To delete your account, please contact our customer support team. Note that this action is irreversible and will remove all your order history."
  //       }
  //     ]
  //   }
  // ];

  // Request initial data and set up real-time handlers
  useEffect(() => {
    console.log('Help & Support component mounted');
    
    wsService.send({
      type: 'get_help_tickets',
      filters: {}
    });

    const handleHelpTicketsData = (data: any) => {
      console.log('Received help tickets data:', data);
      setHelpTickets(data.tickets || []);
      setIsLoading(false);
    };

    const handleTicketUpdated = (data: any) => {
      console.log('Ticket updated:', data);
      wsService.send({ type: 'get_help_tickets', filters: {} });
      setIsResponding(false);
      setShowResponseModal(false);
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
    wsService.onMessage("ticket_updated", handleTicketUpdated);
    wsService.onMessage("error", handleError);

    return () => {
      wsService.onMessage("help_tickets_data", () => {});
      wsService.onMessage("ticket_updated", () => {});
      wsService.onMessage("error", () => {});
    };
  }, [toast]);

  const filteredTickets = helpTickets.filter(ticket => {
    const searchTerm = searchQuery.toLowerCase();
    const matchesSearch = (ticket.subject || '').toLowerCase().includes(searchTerm) ||
                         (ticket.user_name || '').toLowerCase().includes(searchTerm) ||
                         (ticket.id || '').toLowerCase().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        ticket_id: selectedTicket._id || selectedTicket.id,
        response: adminResponse,
        status: 'resolved' // Auto-mark as resolved when responding
      }
    });

    toast({
      title: "Sending Response",
      description: "Sending response to user...",
    });
  };

  const handleStatusChange = (ticketId: string, newStatus: string) => {
    wsService.send({
      type: 'update_ticket_status',
      data: {
        ticket_id: ticketId,
        status: newStatus
      }
    });

    toast({
      title: "Updating Status",
      description: `Changing ticket status to ${newStatus}...`,
    });
  };

  const openResponseModal = (ticket: HelpTicket) => {
    setSelectedTicket(ticket);
    setAdminResponse("");
    setShowResponseModal(true);
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <HelpCircle className="h-8 w-8" />
          Help & Support
        </h1>
        <p className="text-muted-foreground">Manage customer support tickets and provide assistance</p>
      </div>

      {/* Support Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{helpTickets.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {helpTickets.filter(t => t.status === 'open').length}
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
            <div className="text-2xl font-bold">
              {helpTickets.filter(t => t.status === 'in_progress').length}
            </div>
            <p className="text-xs text-muted-foreground">Being handled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {helpTickets.filter(t => 
                t.status === 'resolved' && 
                t.updated_at && 
                new Date(t.updated_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Today's resolutions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Support Tickets */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>
                {isLoading ? "Loading tickets..." : `${filteredTickets.length} tickets found`}
              </CardDescription>
              <div className="flex items-center space-x-4">
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
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.length > 0 ? filteredTickets.map((ticket) => (
                      <TableRow key={ticket._id || ticket.id}>
                        <TableCell className="font-mono text-sm">
                          #{(ticket._id || '').slice(-6)}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={ticket.subject}>
                            {ticket.subject}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="truncate">{ticket.user_name}</span>
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
                            <StatusBadge status={ticket.status} />
                          </div>
                        </TableCell>
                        <TableCell>
                          {ticket.created_at ? format(new Date(ticket.created_at), "MMM dd") : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openResponseModal(ticket)}
                              disabled={ticket.status === 'closed'}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            {ticket.status === 'open' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusChange(ticket._id || ticket.id, 'in_progress')}
                              >
                                Start
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
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
        </div>

        {/* Quick Actions & Contact Info */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common support actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <FileQuestion className="h-4 w-4 mr-2" />
                Create FAQ Entry
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <MessageCircle className="h-4 w-4 mr-2" />
                Send Broadcast
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Book className="h-4 w-4 mr-2" />
                Update Help Docs
              </Button>
            </CardContent>
          </Card>

          {/* Contact Information */}
          {/* <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Support contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Phone Support</p>
                  <p className="text-sm text-muted-foreground">+91 8XX XXX XXXX</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email Support</p>
                  <p className="text-sm text-muted-foreground">support@yourapp.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Working Hours</p>
                  <p className="text-sm text-muted-foreground">Mon-Sat: 9AM-9PM</p>
                </div>
              </div>
            </CardContent>
          </Card> */}
        </div>
      </div>

      {/* FAQ Section */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription>
            Common questions and answers for quick reference
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqData.map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">{category.category}</h3>
                {category.items.map((item, itemIndex) => (
                  <AccordionItem key={`${categoryIndex}-${itemIndex}`} value={`item-${categoryIndex}-${itemIndex}`}>
                    <AccordionTrigger className="text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </div>
            ))}
          </Accordion>
        </CardContent>
      </Card> */}

      {/* Response Modal */}
      <Dialog open={showResponseModal} onOpenChange={setShowResponseModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Respond to Support Ticket</DialogTitle>
            <DialogDescription>
              Ticket #{selectedTicket?._id?.slice(-6)} - {selectedTicket?.subject}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-4">
              {/* Ticket Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Ticket Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p><strong>User:</strong> {selectedTicket.user_name}</p>
                      <p><strong>Email:</strong> {selectedTicket.user_email}</p>
                      <p><strong>Phone:</strong> {selectedTicket.phone}</p>
                      <p><strong>Category:</strong> {selectedTicket.category}</p>
                    </div>
                    <div>
                      <p><strong>Priority:</strong> 
                        <Badge className="ml-2" variant={priorityColors[selectedTicket.priority as keyof typeof priorityColors] || "default"}>
                          {selectedTicket.priority}
                        </Badge>
                      </p>
                      <p><strong>Status:</strong> <StatusBadge status={selectedTicket.status} /></p>
                      <p><strong>Created:</strong> {format(new Date(selectedTicket.created_at), "MMM dd, yyyy HH:mm:ss")}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p><strong>Description:</strong></p>
                    <div className="mt-2 p-3 bg-muted rounded-lg">
                      <p className="text-sm">{selectedTicket.message}</p>
                    </div>
                  </div>

                  {selectedTicket.admin_response && (
                    <div>
                      <p><strong>Previous Response:</strong></p>
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm">{selectedTicket.admin_response}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Responded on {selectedTicket.response_at ? format(new Date(selectedTicket.response_at), "MMM dd, yyyy HH:mm") : 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                
                </CardContent>
              </Card>

              {/* Response Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-response">Your Response</Label>
                  <Textarea
                    id="admin-response"
                    placeholder="Type your response to the user..."
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    rows={6}
                    disabled={isResponding}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowResponseModal(false)}
                    disabled={isResponding}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleResponseSubmit}
                    disabled={isResponding || !adminResponse.trim()}
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}