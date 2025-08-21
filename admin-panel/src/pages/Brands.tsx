import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardStore } from "@/store/dashboardStore";
import { wsService } from "@/services/websocket";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, Upload, Tag, X } from "lucide-react";
import { format } from "date-fns";

// Define the interface for form data
interface BrandFormData {
  name: string;
  description: string;
  logo: string;
  status: string;
}

export default function Brands() {
  const { brands, setBrands } = useDashboardStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState<BrandFormData>({
    name: "",
    description: "",
    logo: "",
    status: "active",
  });

  // Request initial data and set up real-time handlers
  useEffect(() => {
    console.log('Brands component mounted, requesting data...');
    
    wsService.send({
      type: 'get_brands'
    });

    const handleBrandsData = (data) => {
      console.log('Received brands data:', data);
      setBrands(data.brands || []);
      setIsLoading(false);
    };

    const handleBrandCreated = (data) => {
      console.log('Brand created:', data);
      wsService.send({ type: 'get_brands' });
      toast({
        title: "Brand Created",
        description: "New brand has been created successfully",
      });
    };

    const handleBrandUpdated = (data) => {
      console.log('Brand updated:', data);
      wsService.send({ type: 'get_brands' });
      toast({
        title: "Brand Updated",
        description: "Brand has been updated successfully",
      });
    };

    const handleBrandDeleted = (data) => {
      console.log('Brand deleted:', data);
      wsService.send({ type: 'get_brands' });
      toast({
        title: "Brand Deleted",
        description: "Brand has been deleted successfully",
      });
    };

    const handleUploadProgress = (data) => {
      console.log('Upload progress:', data);
      if (data.progress === 100) {
        setIsUploading(false);
      }
    };

    const handleError = (data) => {
      console.error('WebSocket error:', data);
      setIsLoading(false);
      setIsUploading(false);
      toast({
        title: "Error",
        description: data.message || "An error occurred",
        variant: "destructive",
      });
    };

    // Register message handlers
    wsService.onMessage("brands_data", handleBrandsData);
    wsService.onMessage("brand_created", handleBrandCreated);
    wsService.onMessage("brand created", handleBrandCreated);
    wsService.onMessage("brand_updated", handleBrandUpdated);
    wsService.onMessage("brand_deleted", handleBrandDeleted);
    wsService.onMessage("upload_progress", handleUploadProgress);
    wsService.onMessage("error", handleError);

    return () => {
      wsService.onMessage("brands_data", () => {});
      wsService.onMessage("brand_created", () => {});
      wsService.onMessage("brand created", () => {});
      wsService.onMessage("brand_updated", () => {});
      wsService.onMessage("brand_deleted", () => {});
      wsService.onMessage("upload_progress", () => {});
      wsService.onMessage("error", () => {});
    };
  }, [setBrands, toast]);

  const filteredBrands = brands.filter(brand =>
    brand.name && brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Submitting brand form:', formData);
    console.log('Editing brand:', editingBrand);
    
    try {
      const brandData = {
        name: formData.name,
        description: formData.description,
        logo: formData.logo, // This will include base64 data if a new logo is uploaded
        status: formData.status,
      };

      setIsLoading(true);

      if (editingBrand) {
        const updateData = {
          _id: editingBrand._id || editingBrand.id,
          ...brandData
        };
        console.log('Sending update_brand with data:', updateData);
        
        wsService.send({
          type: 'update_brand',
          data: updateData
        });
        toast({
          title: "Updating Brand",
          description: "Please wait...",
        });
      } else {
        console.log('Sending create_brand with data:', brandData);
        
        wsService.send({
          type: 'create_brand',
          data: brandData
        });
        toast({
          title: "Creating Brand",
          description: "Please wait...",
        });
      }

      // Reset form
      setFormData({
        name: "",
        description: "",
        logo: "",
        status: "active",
      });
      setLogoPreview(null);
      setShowAddModal(false);
      setEditingBrand(null);
      
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (brand: any) => {
    console.log('Editing brand:', brand);
    
    try {
      setEditingBrand(brand);
      setFormData({
        name: brand.name || "",
        description: brand.description || "",
        logo: "", // Don't pre-fill with existing logo URL for new uploads
        status: brand.status || "active",
      });
      setLogoPreview(brand.logo || null); // Show existing logo as preview
      setShowAddModal(true);
    } catch (error) {
      console.error('Error in handleEdit:', error);
      toast({
        title: "Error",
        description: "Failed to load brand data for editing",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (brandId: string) => {
    console.log('Deleting brand with ID:', brandId);
    
    if (confirm("Are you sure you want to delete this brand? This will also delete the logo.")) {
      setIsLoading(true);
      wsService.send({
        type: 'delete_brand',
        data: { _id: brandId }
      });
      toast({
        title: "Deleting Brand",
        description: "Please wait...",
      });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setFormData({ ...formData, logo: result });
        setLogoPreview(result);
        setIsUploading(false);
        toast({
          title: "Logo Ready",
          description: "Logo loaded and ready to upload",
        });
      };
      reader.onerror = () => {
        setIsUploading(false);
        toast({
          title: "Upload Error",
          description: "Failed to read the image file",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setFormData({ ...formData, logo: "" });
    setLogoPreview(null);
  };

  const resetForm = () => {
    console.log('Resetting form');
    setEditingBrand(null);
    setFormData({
      name: "",
      description: "",
      logo: "",
      status: "active",
    });
    setLogoPreview(null);
  };

  const handleModalClose = (open: boolean) => {
    setShowAddModal(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Tag className="h-8 w-8" />
            Brands
          </h1>
          <p className="text-muted-foreground">Manage your product brands</p>
        </div>
        <Dialog open={showAddModal} onOpenChange={handleModalClose}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Brand
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingBrand ? "Edit Brand" : "Add New Brand"}</DialogTitle>
              <DialogDescription>
                {editingBrand ? "Update brand information" : "Fill in the details to create a new brand"}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Brand Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brand description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Brand Logo</Label>
                <div className="space-y-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={isUploading}
                  />
                  
                  {isUploading && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm text-muted-foreground">Processing image...</span>
                    </div>
                  )}
                  
                  {logoPreview && (
                    <div className="relative inline-block">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-20 w-20 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={removeLogo}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Upload a logo image (max 5MB, PNG/JPG/WebP)
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleModalClose(false)}
                  disabled={isLoading || isUploading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || isUploading}
                >
                  {isLoading ? "Processing..." : 
                   isUploading ? "Uploading..." : 
                   (editingBrand ? "Update Brand" : "Create Brand")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brand Management</CardTitle>
          <CardDescription>
            {filteredBrands.length} brands found
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && brands.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading brands...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Logo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.map((brand) => (
                  <TableRow key={brand._id || brand.id}>
                    <TableCell>
                      {brand.logo ? (
                        <img
                          src={brand.logo}
                          alt={brand.name}
                          className="h-12 w-12 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center border">
                          <Tag className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{brand.description}</TableCell>
                    <TableCell>
                      <StatusBadge status={brand.status} />
                    </TableCell>
                    <TableCell>
                      {brand.createdAt ? format(new Date(brand.createdAt), "MMM dd, yyyy") : 
                       brand.created_at ? format(new Date(brand.created_at), "MMM dd, yyyy") : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(brand)}
                          disabled={isLoading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(brand._id || brand.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {!isLoading && filteredBrands.length === 0 && (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No brands found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}