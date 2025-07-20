import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { apiService, extractData, handleApiError } from '../services/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'user',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiService.getUsers();
      console.log('Raw API response:', response);
      console.log('Response data:', response.data);
      
      const usersArray = extractData(response);
      console.log('Extracted users array:', usersArray);
      console.log('Array length:', usersArray?.length);
      
      const safeUsers = Array.isArray(usersArray) ? usersArray : [];
      console.log('Safe users:', safeUsers);
      
      // Ensure each user has an 'id' field for DataGrid
      const usersWithId = safeUsers.map(user => {
        const userWithId = {
          ...user,
          id: user.id || user._id,
        };
        console.log('User with id:', userWithId);
        return userWithId;
      });
      console.log('Final users with id:', usersWithId);
      console.log('Final array length:', usersWithId.length);
      
      setUsers(usersWithId);
    } catch (error) {
      console.error('Error fetching users:', error);
      const errorResult = handleApiError(error);
      setError(errorResult.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    try {
      const response = await apiService.createUser(formData);
      console.log('User created:', response);
      setAddDialogOpen(false);
      setFormData({ name: '', email: '', phone: '', password: '', role: 'user' });
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error creating user:', error);
      const errorResult = handleApiError(error);
      setError(errorResult.message);
    }
  };

  const handleEditUser = async () => {
    try {
      const updateData = { ...formData };
      delete updateData.password; // Don't send password if empty
      if (!updateData.password) {
        delete updateData.password;
      }
      
      const response = await apiService.updateUser(editingUser.id, updateData);
      console.log('User updated:', response);
      setEditDialogOpen(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', phone: '', password: '', role: 'user' });
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error updating user:', error);
      const errorResult = handleApiError(error);
      setError(errorResult.message);
    }
  };

  const openEditDialog = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      role: user.role || 'user',
    });
    setEditDialogOpen(true);
  };

  const openAddDialog = () => {
    setFormData({ name: '', email: '', phone: '', password: '', role: 'user' });
    setAddDialogOpen(true);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'primary';
      case 'partner':
        return 'secondary';
      default:
        return 'default';
    }
  };

  console.log('Current users state:', users);
  console.log('Users length in state:', users.length);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  return (
    <Box sx={{ pt: 10 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Users ({users.length})</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openAddDialog}
        >
          Add User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {users.length === 0 && !loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No users found
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name || 'N/A'}</TableCell>
                <TableCell>{user.email || 'N/A'}</TableCell>
                <TableCell>{user.phone || 'N/A'}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role === 'admin' ? 'Admin' : user.role === 'partner' ? 'Partner' : 'User'}
                    color={getRoleColor(user.role)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{formatDate(user.created_at || user.createdAt)}</TableCell>
                <TableCell>
                  <Tooltip title="Edit User">
                    <IconButton
                      size="small"
                      onClick={() => openEditDialog(user)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="partner">Partner</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddUser} variant="contained">Add User</Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Password (leave blank to keep current)"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="partner">Partner</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditUser} variant="contained">Update User</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users; 