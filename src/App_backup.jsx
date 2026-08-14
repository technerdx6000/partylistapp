import { useState, useMemo, useEffect } from 'react'
import {
  Container,
  Typography,
  TextField,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  Divider,
  Badge,
  CircularProgress,
  Alert
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Restaurant as RestaurantIcon
} from '@mui/icons-material'
import { peopleAPI, categoriesAPI, itemsAPI } from './services/api'
import './App.css'

function App() {
  // API data state
  const [people, setPeople] = useState([])
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  
  // Loading and error states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPersonId, setSelectedPersonId] = useState(null)
  const [highlightedItems, setHighlightedItems] = useState([])

  // Dialog states
  const [openPersonDialog, setOpenPersonDialog] = useState(false)
  const [openItemDialog, setOpenItemDialog] = useState(false)
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false)

  // Form states
  const [personName, setPersonName] = useState('')
  const [editingPerson, setEditingPerson] = useState(null)
  const [itemName, setItemName] = useState('')
  const [itemCategory, setItemCategory] = useState(1)
  const [editingItem, setEditingItem] = useState(null)
  const [categoryName, setCategoryName] = useState('')

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const [peopleData, categoriesData, itemsData] = await Promise.all([
          peopleAPI.getAll(),
          categoriesAPI.getAll(),
          itemsAPI.getAll()
        ])
        
        setPeople(peopleData)
        setCategories(categoriesData)
        setItems(itemsData)
        
        // Select first person if available
        if (peopleData.length > 0 && !selectedPersonId) {
          setSelectedPersonId(peopleData[0].id)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        setError('Failed to load data. Please check your connection.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedPersonId])

  // Computed values
  const filteredPeople = useMemo(() => {
    if (!searchTerm) return people
    return people.filter(person => 
      person.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [people, searchTerm])

  const selectedPersonItems = items.filter(item => item.person_id === selectedPersonId)

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category ? category.name : 'Unknown'
  }

  const getPersonItemCount = (personId) => {
    return items.filter(item => item.person_id === personId).length
  }

  // Search functionality
  const searchResults = useMemo(() => {
    if (!searchTerm) return []
    
    const matchingItems = items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    return matchingItems
  }, [items, searchTerm])

  useEffect(() => {
    if (searchTerm && searchResults.length > 0) {
      const itemIds = searchResults.map(item => item.id)
      setHighlightedItems(itemIds)
      
      const timeout = setTimeout(() => {
        setHighlightedItems([])
      }, 3000)
      
      return () => clearTimeout(timeout)
    } else {
      setHighlightedItems([])
    }
  }, [searchResults, searchTerm])

  // CRUD operations
  const addPerson = async () => {
    try {
      const newPerson = await peopleAPI.create({ name: personName })
      setPeople([...people, newPerson])
      setPersonName('')
      setOpenPersonDialog(false)
    } catch (error) {
      setError('Failed to add person')
    }
  }

  const deletePerson = async (personId) => {
    try {
      await peopleAPI.delete(personId)
      setPeople(people.filter(p => p.id !== personId))
      setItems(items.filter(item => item.person_id !== personId))
      if (selectedPersonId === personId) {
        setSelectedPersonId(people.find(p => p.id !== personId)?.id || null)
      }
    } catch (error) {
      setError('Failed to delete person')
    }
  }

  const addItem = async () => {
    try {
      const newItem = await itemsAPI.create({
        name: itemName,
        category_id: itemCategory,
        person_id: selectedPersonId 
      })
      setItems([...items, newItem])
      setItemName('')
      setItemCategory(1)
      setOpenItemDialog(false)
    } catch (error) {
      setError('Failed to add item')
    }
  }

  const deleteItem = async (itemId) => {
    try {
      await itemsAPI.delete(itemId)
      setItems(items.filter(item => item.id !== itemId))
    } catch (error) {
      setError('Failed to delete item')
    }
  }

  const addCategory = async () => {
    try {
      const newCategory = await categoriesAPI.create({ name: categoryName })
      setCategories([...categories, newCategory])
      setCategoryName('')
      setOpenCategoryDialog(false)
    } catch (error) {
      setError('Failed to add category')
    }
  }

  const updatePerson = async () => {
    try {
      const updatedPerson = await peopleAPI.update(editingPerson.id, { name: personName })
      setPeople(people.map(p => p.id === editingPerson.id ? updatedPerson : p))
      setPersonName('')
      setEditingPerson(null)
      setOpenPersonDialog(false)
    } catch (error) {
      setError('Failed to update person')
    }
  }

  const updateItem = async () => {
    try {
      const updatedItem = await itemsAPI.update(editingItem.id, {
        name: itemName,
        category_id: itemCategory,
        person_id: selectedPersonId
      })
      setItems(items.map(item => item.id === editingItem.id ? updatedItem : item))
      setItemName('')
      setItemCategory(1)
      setEditingItem(null)
      setOpenItemDialog(false)
    } catch (error) {
      setError('Failed to update item')
    }
  }

  const openEditPerson = (person) => {
    setEditingPerson(person)
    setPersonName(person.name)
    setOpenPersonDialog(true)
  }

  const openEditItem = (item) => {
    setEditingItem(item)
    setItemName(item.name)
    setItemCategory(item.category_id)
    setOpenItemDialog(true)
  }

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>Loading data...</Typography>
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mx: 2, mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Main App Content */}
      {!loading && (
        <>
          {/* Header */}
          <Box sx={{ p: 2, flexShrink: 0, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h4" component="h1" gutterBottom align="center" 
              sx={{ fontWeight: 'bold', color: 'primary.main', mb: 2 }}>
              Party List Manager
            </Typography>
            
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search people or items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ maxWidth: 600, mx: 'auto', display: 'block' }}
            />
          </Box>

          {/* Main Content */}
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            overflow: 'hidden'
          }}>
            {/* People Panel */}
            <Box sx={{ 
              width: '50%', 
              display: 'flex', 
              flexDirection: 'column',
              borderRight: 1,
              borderColor: 'divider'
            }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon /> People
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setEditingPerson(null)
                      setPersonName('')
                      setOpenPersonDialog(true)
                    }}
                  >
                    Add Person
                  </Button>
                </Box>
              </Box>
              
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <List sx={{ p: 0 }}>
                  {filteredPeople.map((person) => (
                    <ListItem key={person.id} disablePadding>
                      <ListItemButton
                        selected={person.id === selectedPersonId}
                        onClick={() => setSelectedPersonId(person.id)}
                        sx={{ 
                          '&.Mui-selected': { 
                            backgroundColor: 'primary.light',
                            '&:hover': { backgroundColor: 'primary.light' }
                          }
                        }}
                      >
                        <ListItemText 
                          primary={person.name}
                          secondary={`${getPersonItemCount(person.id)} items`}
                        />
                        <Badge 
                          badgeContent={getPersonItemCount(person.id)} 
                          color="primary" 
                          sx={{ mr: 1 }}
                        />
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditPerson(person)
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation()
                            deletePerson(person.id)
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>

            {/* Items Panel */}
            <Box sx={{ 
              width: '50%', 
              display: 'flex', 
              flexDirection: 'column'
            }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RestaurantIcon /> 
                    {selectedPersonId 
                      ? `${people.find(p => p.id === selectedPersonId)?.name}'s Items`
                      : 'Items'
                    }
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setOpenCategoryDialog(true)}
                    >
                      Add Category
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setEditingItem(null)
                        setItemName('')
                        setItemCategory(1)
                        setOpenItemDialog(true)
                      }}
                      disabled={!selectedPersonId}
                    >
                      Add Item
                    </Button>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <List sx={{ p: 0 }}>
                  {selectedPersonItems.map((item) => (
                    <ListItem key={item.id} divider>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography 
                              variant="body1"
                              sx={{ 
                                backgroundColor: highlightedItems.includes(item.id) 
                                  ? 'yellow' : 'transparent',
                                padding: highlightedItems.includes(item.id) ? '2px 4px' : 0
                              }}
                            >
                              {item.name}
                            </Typography>
                            <Chip 
                              label={getCategoryName(item.category_id)} 
                              size="small" 
                              variant="outlined"
                            />
                          </Box>
                        }
                      />
                      <IconButton 
                        size="small" 
                        onClick={() => openEditItem(item)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => deleteItem(item.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItem>
                  ))}
                  {selectedPersonItems.length === 0 && (
                    <ListItem>
                      <ListItemText 
                        primary="No items assigned"
                        sx={{ textAlign: 'center', color: 'text.secondary' }}
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            </Box>
          </Box>

          {/* Person Dialog */}
          <Dialog open={openPersonDialog} onClose={() => setOpenPersonDialog(false)}>
            <DialogTitle>
              {editingPerson ? 'Edit Person' : 'Add New Person'}
            </DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Name"
                fullWidth
                variant="outlined"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenPersonDialog(false)}>Cancel</Button>
              <Button 
                onClick={editingPerson ? updatePerson : addPerson}
                disabled={!personName.trim()}
              >
                {editingPerson ? 'Update' : 'Add'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Item Dialog */}
          <Dialog open={openItemDialog} onClose={() => setOpenItemDialog(false)}>
            <DialogTitle>
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Item Name"
                fullWidth
                variant="outlined"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={itemCategory}
                  label="Category"
                  onChange={(e) => setItemCategory(e.target.value)}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenItemDialog(false)}>Cancel</Button>
              <Button 
                onClick={editingItem ? updateItem : addItem}
                disabled={!itemName.trim()}
              >
                {editingItem ? 'Update' : 'Add'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Category Dialog */}
          <Dialog open={openCategoryDialog} onClose={() => setOpenCategoryDialog(false)}>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Category Name"
                fullWidth
                variant="outlined"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenCategoryDialog(false)}>Cancel</Button>
              <Button 
                onClick={addCategory}
                disabled={!categoryName.trim()}
              >
                Add
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  )
}

export default App
