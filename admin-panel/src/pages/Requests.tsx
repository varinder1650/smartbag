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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardStore } from "@/store/dashboardStore";
import { wsService } from "@/services/websocket";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Lightbulb, 
  TrendingUp, 
  ThumbsUp, 
  ThumbsDown,
  MessageSquare, 
  User,
  Calendar,
  Star,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  Tag
} from "lucide-react";
import { format } from "date-fns";

interface UserSuggestion {
  _id: string;
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  user_name: string;
  user_email: string;
  phone: string;
  created_at: string;
  updated_at: string;
  admin_notes?: string;
  votes_up: number;
  votes_down: number;
  implementation_status?: string;
  estimated_effort?: string;
}

export default function UserSuggestions() {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedSuggestion, setSelectedSuggestion] = useState<UserSuggestion | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "submitted", label: "Submitted" },
    { value: "under_review", label: "Under Review" },
    { value: "approved", label: "Approved" },
    { value: "in_development", label: "In Development" },
    { value: "implemented", label: "Implemented" },
    { value: "rejected", label: "Rejected" },
  ];

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    { value: "feature_request", label: "Feature Request" },
    { value: "ui_improvement", label: "UI Improvement" },
    { value: "bug_report", label: "Bug Report" },
    { value: "performance", label: "Performance" },
    { value: "content", label: "Content" },
    { value: "other", label: "Other" },
  ];

  const priorityColors = {
    low: "secondary",
    medium: "default",
    high: "destructive",
    urgent: "destructive"
  } as const;

  const implementationStatusColors = {
    not_planned: "secondary",
    planned: "default",
    in_progress: "default",
    completed: "default"
  } as const;

  // Request initial data and set up real-time handlers
  useEffect(() => {
    console.log('User Suggestions component mounted');
    
    wsService.send({
      type: 'get_user_suggestions',
      filters: {}
    });

    const handleSuggestionsData = (data: any) => {
      console.log('Received suggestions data:', data);
      setSuggestions(data.suggestions || []);
      setIsLoading(false);
    };

    const handleSuggestionUpdated = (data: any) => {
      console.log('Suggestion updated:', data);
      wsService.send({ type: 'get_user_suggestions', filters: {} });
      setIsUpdating(false);
      setShowDetailsModal(false);
      toast({
        title: "Suggestion Updated",
        description: "Suggestion has been updated successfully",
      });
    };

    const handleError = (data: any) => {
      console.error('Suggestions WebSocket error:', data);
      setIsLoading(false);
      setIsUpdating(false);
      
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
    wsService.onMessage("suggestions_data", handleSuggestionsData);
    wsService.onMessage("suggestion_updated", handleSuggestionUpdated);
    wsService.onMessage("error", handleError);

    return () => {
      wsService.onMessage("suggestions_data", () => {});
      wsService.onMessage("suggestion_updated", () => {});
      wsService.onMessage("error", () => {});
    };
  }, [toast]);

  const filteredSuggestions = suggestions.filter(suggestion => {
    const searchTerm = searchQuery.toLowerCase();
    const matchesSearch = (suggestion.title || '').toLowerCase().includes(searchTerm) ||
                         (suggestion.description || '').toLowerCase().includes(searchTerm) ||
                         (suggestion.user_name || '').toLowerCase().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || suggestion.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || suggestion.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleStatusChange = (suggestionId: string, newStatus: string) => {
    setIsUpdating(true);

    wsService.send({
      type: 'update_suggestion_status',
      data: {
        suggestion_id: suggestionId,
        status: newStatus,
        // admin_notes: adminNotes
      }
    });

    toast({
      title: "Updating Status",
      description: `Changing suggestion status to ${newStatus}...`,
    });

    setAdminNotes("");
  };

  const handleImplementationStatusChange = (suggestionId: string, implementationStatus: string, effort?: string) => {
    setIsUpdating(true);

    wsService.send({
      type: 'update_implementation_status',
      data: {
        suggestion_id: suggestionId,
        implementation_status: implementationStatus,
        estimated_effort: effort,
        admin_notes: adminNotes
      }
    });

    toast({
      title: "Updating Implementation Status",
      description: `Updating implementation status...`,
    });
  };

  const openDetailsModal = (suggestion: UserSuggestion) => {
    setSelectedSuggestion(suggestion);
    setAdminNotes(suggestion.admin_notes || "");
    setSelectedStatus(suggestion.status || "");
    setShowDetailsModal(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <FileText className="h-4 w-4" />;
      case 'under_review':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_development':
        return <TrendingUp className="h-4 w-4" />;
      case 'implemented':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getVoteScore = (suggestion: UserSuggestion) => {
    return (suggestion.votes_up || 0) - (suggestion.votes_down || 0);
  };

  const getCategoryStats = () => {
    const stats = suggestions.reduce((acc, suggestion) => {
      const category = suggestion.category || 'other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(stats).map(([category, count]) => ({
      category,
      count,
      label: categoryOptions.find(opt => opt.value === category)?.label || category
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Lightbulb className="h-8 w-8" />
          User Suggestions
        </h1>
        <p className="text-muted-foreground">Manage user feedback and feature requests</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suggestions</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suggestions.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suggestions.filter(s => s.status === 'pending' || s.status === 'under_review').length}
            </div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Development</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suggestions.filter(s => s.status === 'in_development').length}
            </div>
            <p className="text-xs text-muted-foreground">Being built</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Implemented</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suggestions.filter(s => s.status === 'implemented').length}
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suggestions.filter(s => s.status === 'rejected').length}
            </div>
            {/* <p className="text-xs text-muted-foreground">User rating</p> */}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Suggestions Table */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>User Suggestions</CardTitle>
              <CardDescription>
                {isLoading ? "Loading suggestions..." : `${filteredSuggestions.length} suggestions found`}
              </CardDescription>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search suggestions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                    disabled={isLoading}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter} disabled={isLoading}>
                  <SelectTrigger className="w-[150px]">
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
                <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={isLoading}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
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
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading suggestions...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Category</TableHead>
                      {/* <TableHead>Votes</TableHead> */}
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuggestions.length > 0 ? filteredSuggestions.map((suggestion) => (
                      <TableRow key={suggestion._id || suggestion.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="font-medium truncate" title={suggestion.product_name}>
                              {suggestion.product_name}
                            </p>
                            <p className="text-sm text-muted-foreground truncate" title={suggestion.description}>
                              {suggestion.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="truncate">{suggestion.user_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Tag className="h-3 w-3 mr-1" />
                            {categoryOptions.find(opt => opt.value === suggestion.category)?.label || suggestion.category}
                          </Badge>
                        </TableCell>
                        {/* <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{suggestion.votes_up || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ThumbsDown className="h-4 w-4 text-red-500" />
                              <span className="text-sm">{suggestion.votes_down || 0}</span>
                            </div>
                            <div className="font-medium text-sm">
                              ({getVoteScore(suggestion) >= 0 ? '+' : ''}{getVoteScore(suggestion)})
                            </div>
                          </div>
                        </TableCell> */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(suggestion.status)}
                            <StatusBadge status={suggestion.status} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {suggestion.created_at ? format(new Date(suggestion.created_at), "MMM dd") : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDetailsModal(suggestion)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No suggestions found matching your criteria</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Suggestions by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getCategoryStats().map((stat) => (
                  <div key={stat.category} className="flex items-center justify-between">
                    <span className="text-sm">{stat.label}</span>
                    <Badge variant="secondary">{stat.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {/* <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>At a glance metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Most Upvoted</span>
                <Badge variant="secondary">
                  {Math.max(...suggestions.map(s => s.votes_up || 0), 0)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">This Month</span>
                <Badge variant="secondary">
                  {suggestions.filter(s => 
                    new Date(s.created_at).getMonth() === new Date().getMonth() &&
                    new Date(s.created_at).getFullYear() === new Date().getFullYear()
                  ).length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Response Rate</span>
                <Badge variant="secondary">
                  {suggestions.length > 0 
                    ? `${Math.round((suggestions.filter(s => s.admin_notes).length / suggestions.length) * 100)}%`
                    : '0%'
                  }
                </Badge>
              </div>
            </CardContent>
          </Card> */}
        </div>
      </div>

      {/* Suggestion Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suggestion Details</DialogTitle>
            <DialogDescription>
              Review and manage user suggestion
            </DialogDescription>
          </DialogHeader>
          
          {selectedSuggestion && (
            <div className="space-y-6">
              {/* Suggestion Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedSuggestion.title}</CardTitle>
                  <CardDescription className="flex items-center gap-4">
                    <span>By {selectedSuggestion.user_name} ({selectedSuggestion.user_email})</span>
                    <span>Phone: {selectedSuggestion.phone}</span>
                    <Badge variant="outline">
                      {categoryOptions.find(opt => opt.value === selectedSuggestion.category)?.label || selectedSuggestion.category}
                    </Badge>
                    <span>{format(new Date(selectedSuggestion.created_at), "MMM dd, yyyy")}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Product Name</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        {selectedSuggestion.product_name}
                      </p>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        {selectedSuggestion.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {/* <div>
                        <h4 className="font-medium mb-2">Community Votes</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-4 w-4 text-green-500" />
                            <span>{selectedSuggestion.votes_up || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsDown className="h-4 w-4 text-red-500" />
                            <span>{selectedSuggestion.votes_down || 0}</span>
                          </div>
                          <div className="font-medium">
                            Score: {getVoteScore(selectedSuggestion)}
                          </div>
                        </div>
                      </div> */}

                      <div>
                        <h4 className="font-medium mb-2">Current Status</h4>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(selectedSuggestion.status)}
                          <StatusBadge status={selectedSuggestion.status} />
                        </div>
                      </div>

                      {/* <div>
                        <h4 className="font-medium mb-2">Implementation</h4>
                        <Badge variant={implementationStatusColors[selectedSuggestion.implementation_status as keyof typeof implementationStatusColors] || "secondary"}>
                          {selectedSuggestion.implementation_status || 'Not Set'}
                        </Badge>
                      </div> */}
                    </div>

                    {selectedSuggestion.estimated_effort && (
                      <div>
                        <h4 className="font-medium mb-2">Estimated Effort</h4>
                        <p className="text-muted-foreground">{selectedSuggestion.estimated_effort}</p>
                      </div>
                    )}

                    {selectedSuggestion.admin_notes && (
                      <div>
                        <h4 className="font-medium mb-2">Admin Notes</h4>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm">{selectedSuggestion.admin_notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Admin Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Update Status</CardTitle>
                    <CardDescription>Change the suggestion status</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-status">New Status</Label>
                      <Select 
                        value={selectedStatus}
                        onValueChange={setSelectedStatus}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.slice(1).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* <div className="space-y-2">
                      <Label htmlFor="admin-notes">Admin Notes</Label>
                      <Textarea
                        id="admin-notes"
                        placeholder="Add notes about this decision..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        rows={4}
                      />
                    </div> */}

                    <div className="flex gap-2">
                      <Button 
                        className="flex-1"
                        onClick={() => handleStatusChange(selectedSuggestion._id || selectedSuggestion.id, selectedStatus)}
                        disabled={isUpdating || !selectedStatus}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Update Status
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="flex-1"
                        onClick={() => handleStatusChange(selectedSuggestion._id || selectedSuggestion.id, 'rejected')}
                        disabled={isUpdating}
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Implementation Planning</CardTitle>
                    <CardDescription>Track development progress</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="implementation-status">Implementation Status</Label>
                      <Select defaultValue={selectedSuggestion.implementation_status || "not_planned"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_planned">Not Planned</SelectItem>
                          <SelectItem value="planned">Planned</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="effort-estimate">Effort Estimate</Label>
                      <Select defaultValue={selectedSuggestion.estimated_effort || ""}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select effort level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small (1-2 days)</SelectItem>
                          <SelectItem value="medium">Medium (3-7 days)</SelectItem>
                          <SelectItem value="large">Large (1-2 weeks)</SelectItem>
                          <SelectItem value="extra_large">Extra Large (2+ weeks)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      className="w-full"
                      onClick={() => handleImplementationStatusChange(
                        selectedSuggestion._id || selectedSuggestion.id, 
                        'planned',
                        'medium'
                      )}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Update Implementation
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card> */}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}