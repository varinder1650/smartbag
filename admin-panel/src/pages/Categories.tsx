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
import { Plus, Search, Edit, Trash2, Upload, FolderTree, Folder, X, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

// Define the interface for form data
interface CategoryFormData {
  name: string;
  description: string;
  image: string;
  parentId: string;
  status: string;
}

export default function Categories() {
  const { categories, setCategories } = useDashboardStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hasNewImage, setHasNewImage] = useState(false); // Track if user uploaded new image
  
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    description: "",
    image: "",
    parentId: "none", // Use "none" instead of empty string
    status: "active",
  });

  // Request initial data and set up real-time handlers
  useEffect(() => {
    console.log('Categories component mounted, requesting data...');
    
    wsService.send({
      type: 'get_categories'
    });

    const handleCategoriesData = (data) => {
      console.log('Received categories data:', data);
      setCategories(data.categories || []);
      setIsLoading(false);
    };

    const handleCategoryCreated = (data) => {
      console.log('Category created:', data);
      wsService.send({ type: 'get_categories' });
      toast({
        title: "Category Created",
        description: "New category has been created successfully",
      });
      setIsLoading(false);
    };

    const handleCategoryUpdated = (data) => {
      console.log('Category updated:', data);
      wsService.send({ type: 'get_categories' });
      toast({
        title: "Category Updated", 
        description: "Category has been updated successfully",
      });
      setIsLoading(false);
    };

    const handleCategoryDeleted = (data) => {
      console.log('Category deleted:', data);
      wsService.send({ type: 'get_categories' });
      toast({
        title: "Category Deleted",
        description: "Category has been deleted successfully",
      });
      setIsLoading(false);
    };

    const handleUploadProgress = (data) => {
      console.log('Upload progress:', data);
      if (data.progress === 100) {
        setIsUploading(false);
        toast({
          title: "Upload Complete",
          description: data.message || "Image uploaded successfully",
        });
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
    wsService.onMessage("categories_data", handleCategoriesData);
    wsService.onMessage("category_created", handleCategoryCreated);
    wsService.onMessage("category created", handleCategoryCreated);
    wsService.onMessage("category_updated", handleCategoryUpdated);
    wsService.onMessage("category Updated", handleCategoryUpdated);
    wsService.onMessage("category updated", handleCategoryUpdated);
    wsService.onMessage("category_deleted", handleCategoryDeleted);
    wsService.onMessage("category deleted", handleCategoryDeleted);
    wsService.onMessage("upload_progress", handleUploadProgress);
    wsService.onMessage("error", handleError);

    return () => {
      wsService.onMessage("categories_data", () => {});
      wsService.onMessage("category_created", () => {});
      wsService.onMessage("category created", () => {});
      wsService.onMessage("category_updated", () => {});
      wsService.onMessage("category Updated", () => {});
      wsService.onMessage("category updated", () => {});
      wsService.onMessage("category_deleted", () => {});
      wsService.onMessage("category deleted", () => {});
      wsService.onMessage("upload_progress", () => {});
      wsService.onMessage("error", () => {});
    };
  }, [setCategories, toast]);

  const filteredCategories = categories.filter(category =>
    category.name && category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get parent categories for the dropdown (root categories only)
  const parentCategories = categories.filter(cat => !cat.parentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Submitting category form:', formData);
    console.log('Has new image:', hasNewImage);
    console.log('Editing category:', editingCategory);
    
    try {
      const categoryData = {
        name: formData.name,
        description: formData.description,
        // Convert "none" back to undefined for backend
        parentId: formData.parentId === "none" ? undefined : formData.parentId,
        status: formData.status,
      };

      // ✅ Only include image data if user uploaded a new one
      if (hasNewImage && formData.image) {
        categoryData.image = formData.image;
        console.log('Including new image data in submission');
      }

      setIsLoading(true);

      if (editingCategory) {
        const updateData = {
          _id: editingCategory._id || editingCategory.id,
          ...categoryData
        };
        console.log('Sending update_category with data:', updateData);
        
        wsService.send({
          type: 'update_category',
          data: updateData
        });
        toast({
          title: "Updating Category",
          description: hasNewImage ? "Uploading image and updating category..." : "Updating category...",
        });
      } else {
        console.log('Sending create_category with data:', categoryData);
        
        wsService.send({
          type: 'create_category',
          data: categoryData
        });
        toast({
          title: "Creating Category",
          description: hasNewImage ? "Uploading image and creating category..." : "Creating category...",
        });
      }

      // Reset form
      setFormData({
        name: "",
        description: "",
        image: "",
        parentId: "none",
        status: "active",
      });
      setImagePreview(null);
      setHasNewImage(false);
      setShowAddModal(false);
      setEditingCategory(null);
      
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

  const handleEdit = (category: any) => {
    console.log('Editing category:', category);
    
    try {
      setEditingCategory(category);
      setFormData({
        name: category.name || "",
        description: category.description || "",
        image: "", // Don't include existing image URL in form data
        // Convert undefined/null to "none" for the Select component
        parentId: category.parentId || "none",
        status: category.status || "active",
      });
      
      // ✅ Show existing image as preview but don't mark as new upload
      setImagePreview(category.image || null);
      setHasNewImage(false); // Important: existing image is not a new upload
      setShowAddModal(true);
    } catch (error) {
      console.error('Error in handleEdit:', error);
      toast({
        title: "Error",
        description: "Failed to load category data for editing",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (categoryId: string) => {
    console.log('Deleting category with ID:', categoryId);
    
    if (confirm("Are you sure you want to delete this category? This will also delete the image.")) {
      setIsLoading(true);
      wsService.send({
        type: 'delete_category',
        data: { _id: categoryId }
      });
      toast({
        title: "Deleting Category",
        description: "Please wait...",
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Image file selected:', file.name, file.size, file.type);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file (PNG, JPG, WebP)",
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
        console.log('Image converted to base64, length:', result.length);
        
        setFormData({ ...formData, image: result });
        setImagePreview(result);
        setHasNewImage(true); // ✅ Mark that user uploaded a new image
        setIsUploading(false);
        
        toast({
          title: "Image Ready",
          description: "Image loaded and ready to upload",
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

  const removeImage = () => {
    console.log('Removing image');
    setFormData({ ...formData, image: "" });
    setImagePreview(null);
    setHasNewImage(false);
    
    // Clear the file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const getParentCategoryName = (parentId?: string) => {
    if (!parentId) return "Root Category";
    const parent = categories.find(cat => (cat._id || cat.id) === parentId);
    return parent?.name || "Unknown";
  };

  const resetForm = () => {
    console.log('Resetting form');
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      image: "",
      parentId: "none",
      status: "active",
    });
    setImagePreview(null);
    setHasNewImage(false);
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
            <FolderTree className="h-8 w-8" />
            Categories
          </h1>
          <p className="text-muted-foreground">Manage your product categories</p>
        </div>
        <Dialog open={showAddModal} onOpenChange={handleModalClose}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
              <DialogDescription>
                {editingCategory ? "Update category information" : "Fill in the details to create a new category"}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name</Label>
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
                <Label htmlFor="parentId">Parent Category (Optional)</Label>
                <Select 
                  value={formData.parentId} 
                  onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category or leave empty for root" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* ✅ Use "none" instead of empty string */}
                    <SelectItem value="none">Root Category</SelectItem>
                    {parentCategories.map((parent) => (
                      <SelectItem 
                        key={parent._id || parent.id} 
                        value={parent._id || parent.id || `temp-${parent.name}`}
                      >
                        {parent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Category description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Category Image</Label>
                <div className="space-y-3">
                  {/* File Upload Input */}
                  <div className="flex items-center space-x-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="flex-1"
                    />
                    {imagePreview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeImage}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Upload Status */}
                  {isUploading && (
                    <div className="flex items-center space-x-2 p-2 bg-muted rounded">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm text-muted-foreground">Processing image...</span>
                    </div>
                  )}
                  
                  {/* Image Preview */}
                  {imagePreview && !isUploading && (
                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <img
                        src={imagePreview}
                        alt="Category image preview"
                        className="h-16 w-16 object-cover rounded border"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {hasNewImage ? "New image ready to upload" : "Current image"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {hasNewImage ? "Will be uploaded when you save" : "Existing image from Cloudinary"}
                        </p>
                      </div>
                      {hasNewImage && (
                        <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          New
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Upload Instructions */}
                  <p className="text-xs text-muted-foreground">
                    Upload a category image (max 5MB, PNG/JPG/WebP recommended)
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
                   (editingCategory ? "Update Category" : "Create Category")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Management</CardTitle>
          <CardDescription>
            {filteredCategories.length} categories found
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && categories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading categories...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Parent Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category._id || category.id}>
                    <TableCell>
                      {category.image ? (
                        <img
                          src={category.image}
                          alt={category.name}
                          className="h-12 w-12 rounded-lg object-cover border"
                          onError={(e) => {
                            console.error('Failed to load category image:', category.image);
                            // Show fallback icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      
                      {/* Fallback icon (always present, hidden if image loads) */}
                      <div 
                        className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center border"
                        style={{ display: category.image ? 'none' : 'flex' }}
                      >
                        <Folder className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>{getParentCategoryName(category.parentId)}</TableCell>
                    <TableCell className="max-w-xs truncate">{category.description}</TableCell>
                    <TableCell>
                      <StatusBadge status={category.status} />
                    </TableCell>
                    <TableCell>
                      {category.createdAt ? format(new Date(category.createdAt), "MMM dd, yyyy") : 
                       category.created_at ? format(new Date(category.created_at), "MMM dd, yyyy") : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(category)}
                          disabled={isLoading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(category._id || category.id)}
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
          
          {!isLoading && filteredCategories.length === 0 && (
            <div className="text-center py-8">
              <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No categories found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}