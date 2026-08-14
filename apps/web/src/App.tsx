import type { Category, Item, Person, RequiredItem } from '@listcollab/shared'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Restaurant as RestaurantIcon,
} from '@mui/icons-material'
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import {
  categoriesAPI,
  itemsAPI,
  peopleAPI,
  requiredItemsAPI,
} from './services/api'
import './App.css'

function App(): React.JSX.Element {
  // API data state
  const [people, setPeople] = useState<Person[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [requiredItems, setRequiredItems] = useState<RequiredItem[]>([])
  
  // Loading and error states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null)
  const [highlightedItems, setHighlightedItems] = useState<number[]>([])
  const [hideAssignedRequired, setHideAssignedRequired] = useState(false)

  // Dialog states
  const [openPersonDialog, setOpenPersonDialog] = useState(false)
  const [openItemDialog, setOpenItemDialog] = useState(false)
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false)
  const [openRequiredItemDialog, setOpenRequiredItemDialog] = useState(false)

  // Form states
  const [personName, setPersonName] = useState('')
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [itemName, setItemName] = useState('')
  const [itemCategory, setItemCategory] = useState(1)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [requiredItemName, setRequiredItemName] = useState('')
  const [requiredItemCategory, setRequiredItemCategory] = useState(1)
  const [editingRequiredItem, setEditingRequiredItem] = useState<RequiredItem | null>(null)
  
  // Assignment dialog state
  const [openAssignmentDialog, setOpenAssignmentDialog] = useState(false)
  const [assigningRequiredItem, setAssigningRequiredItem] = useState<RequiredItem | null>(null)
  const [assignedPersonId, setAssignedPersonId] = useState<number | ''>('')

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const [peopleData, categoriesData, itemsData, requiredItemsData] = await Promise.all([
          peopleAPI.getAll(),
          categoriesAPI.getAll(),
          itemsAPI.getAll(),
          requiredItemsAPI.getAll()
        ])
        
        setPeople(peopleData)
        setCategories(categoriesData)
        setItems(itemsData)
        setRequiredItems(requiredItemsData)
        
        // Select first person if available
        const firstPerson = peopleData[0]

        if (firstPerson && !selectedPersonId) {
          setSelectedPersonId(firstPerson.id)
        }
      } catch {
        setError('Failed to load data. Please check your connection.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [selectedPersonId])

  // Computed values
  const filteredPeople = useMemo(() => {
    if (!searchTerm) return people
    return people.filter(person => 
      person.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [people, searchTerm])

  const selectedPersonItems = items.filter(item => item.person_id === selectedPersonId)

  const filteredRequiredItems = useMemo(() => {
    let filtered = requiredItems
    
    if (hideAssignedRequired) {
      filtered = filtered.filter(item => !item.person_id)
    }
    
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.person_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    return filtered
  }, [requiredItems, hideAssignedRequired, searchTerm])

  const getCategoryName = (categoryId: number): string => {
    const category = categories.find(cat => cat.id === categoryId)
    return category ? category.name : 'Unknown'
  }

  const getPersonItemCount = (personId: number): number => {
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
  const addPerson = async (): Promise<void> => {
    try {
      const newPerson = await peopleAPI.create({ name: personName })
      setPeople([...people, newPerson])
      setPersonName('')
      setOpenPersonDialog(false)
    } catch {
      setError('Failed to add person')
    }
  }

  const deletePerson = async (personId: number): Promise<void> => {
    try {
      await peopleAPI.delete(personId)
      setPeople(people.filter(p => p.id !== personId))
      setItems(items.filter(item => item.person_id !== personId))
      if (selectedPersonId === personId) {
        setSelectedPersonId(people.find(p => p.id !== personId)?.id || null)
      }
    } catch {
      setError('Failed to delete person')
    }
  }

  const addItem = async (): Promise<void> => {
    if (selectedPersonId === null) return

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
    } catch {
      setError('Failed to add item')
    }
  }

  const deleteItem = async (itemId: number): Promise<void> => {
    try {
      await itemsAPI.delete(itemId)
      setItems(items.filter(item => item.id !== itemId))
    } catch {
      setError('Failed to delete item')
    }
  }

  const addCategory = async (): Promise<void> => {
    try {
      const newCategory = await categoriesAPI.create({ name: categoryName })
      setCategories([...categories, newCategory])
      setCategoryName('')
      setOpenCategoryDialog(false)
    } catch {
      setError('Failed to add category')
    }
  }

  // Required Items Functions
  const addRequiredItem = async (): Promise<void> => {
    if (!requiredItemName.trim()) return
    
    try {
      const requiredItemData = {
        name: requiredItemName.trim(),
        category_id: requiredItemCategory
      }
      
      const response = await requiredItemsAPI.create(requiredItemData)
      setRequiredItems([...requiredItems, response])
      setRequiredItemName('')
      setRequiredItemCategory(1)
      setOpenRequiredItemDialog(false)
    } catch {
      setError('Failed to add required item')
    }
  }

  const updateRequiredItem = async (): Promise<void> => {
    if (!requiredItemName.trim() || !editingRequiredItem) return
    
    try {
      const requiredItemData = {
        name: requiredItemName.trim(),
        category_id: requiredItemCategory
      }
      
      const response = await requiredItemsAPI.update(editingRequiredItem.id, requiredItemData)
      setRequiredItems(requiredItems.map(item => 
        item.id === editingRequiredItem.id ? response : item
      ))
      setRequiredItemName('')
      setRequiredItemCategory(1)
      setEditingRequiredItem(null)
      setOpenRequiredItemDialog(false)
    } catch {
      setError('Failed to update required item')
    }
  }

  const handleRequiredItemSave = (): void => {
    if (editingRequiredItem) {
      void updateRequiredItem()
    } else {
      void addRequiredItem()
    }
  }

  const assignRequiredItem = async (): Promise<void> => {
    if (!assigningRequiredItem || !assignedPersonId) return
    
    try {
      const response = await requiredItemsAPI.assign(assigningRequiredItem.id, assignedPersonId)
      setRequiredItems(requiredItems.map(item => 
        item.id === assigningRequiredItem.id ? response : item
      ))
      setAssignedPersonId('')
      setAssigningRequiredItem(null)
      setOpenAssignmentDialog(false)
    } catch {
      setError('Failed to assign required item')
    }
  }

  const updatePerson = async (): Promise<void> => {
    if (!editingPerson) return

    try {
      const updatedPerson = await peopleAPI.update(editingPerson.id, { name: personName })
      setPeople(people.map(p => p.id === editingPerson.id ? updatedPerson : p))
      setPersonName('')
      setEditingPerson(null)
      setOpenPersonDialog(false)
    } catch {
      setError('Failed to update person')
    }
  }

  const updateItem = async (): Promise<void> => {
    if (!editingItem) return

    try {
      const updatedItem = await itemsAPI.update(editingItem.id, {
        name: itemName,
        category_id: itemCategory
      })
      setItems(items.map(item => item.id === editingItem.id ? updatedItem : item))
      setItemName('')
      setItemCategory(1)
      setEditingItem(null)
      setOpenItemDialog(false)
    } catch {
      setError('Failed to update item')
    }
  }

  const openEditPerson = (person: Person): void => {
    setEditingPerson(person)
    setPersonName(person.name)
    setOpenPersonDialog(true)
  }

  const openEditItem = (item: Item): void => {
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
      overflow: 'hidden',
      width: '100%'
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
            overflow: 'hidden',
            flexDirection: { xs: 'column', lg: 'row' },
            width: '100%'
          }}>
            {/* People Panel */}
            <Box sx={{ 
              flex: 1,
              display: 'flex', 
              flexDirection: 'column',
              borderRight: { lg: 1, xs: 0 },
              borderBottom: { xs: 1, lg: 0 },
              borderColor: 'divider',
              minHeight: { xs: '33%', lg: 'auto' }
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
                            void deletePerson(person.id)
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
              flex: 1,
              display: 'flex', 
              flexDirection: 'column',
              borderRight: { lg: 1, xs: 0 },
              borderBottom: { xs: 1, lg: 0 },
              borderColor: 'divider',
              minHeight: { xs: '33%', lg: 'auto' }
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
                        onClick={() => {
                          void deleteItem(item.id)
                        }}
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

            {/* Required Items Panel */}
            <Box sx={{ 
              flex: 1,
              display: 'flex', 
              flexDirection: 'column',
              minHeight: { xs: '33%', lg: 'auto' }
            }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    📋 Required Items
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setEditingRequiredItem(null)
                      setRequiredItemName('')
                      setRequiredItemCategory(1)
                      setOpenRequiredItemDialog(true)
                    }}
                  >
                    Add Required
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setHideAssignedRequired(!hideAssignedRequired)}
                    sx={{ textTransform: 'none' }}
                  >
                    {hideAssignedRequired ? '👁️ Show All' : '🔍 Hide Assigned'}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    ({filteredRequiredItems.length} items)
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <List sx={{ p: 0 }}>
                  {filteredRequiredItems.map((item) => (
                    <ListItem key={item.id} divider>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography 
                              variant="body1"
                              sx={{ 
                                textDecoration: item.is_fulfilled ? 'line-through' : 'none',
                                opacity: item.is_fulfilled ? 0.7 : 1,
                                fontWeight: item.is_fulfilled ? 'normal' : 'medium'
                              }}
                            >
                              {item.name}
                            </Typography>
                            <Chip 
                              label={item.category_name} 
                              size="small" 
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          item.person_name ? (
                            <Typography variant="body2" color="success.main">
                              ✅ Assigned to {item.person_name}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="warning.main">
                              ⚠️ Unassigned
                            </Typography>
                          )
                        }
                      />
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setAssigningRequiredItem(item)
                          setAssignedPersonId(item.person_id ?? '')
                          setOpenAssignmentDialog(true)
                        }}
                        title={item.person_name ? 'Reassign' : 'Assign to someone'}
                      >
                        <PersonIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setEditingRequiredItem(item)
                          setRequiredItemName(item.name)
                          setRequiredItemCategory(item.category_id)
                          setOpenRequiredItemDialog(true)
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </ListItem>
                  ))}
                  {filteredRequiredItems.length === 0 && (
                    <ListItem>
                      <ListItemText 
                        primary="No required items"
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
                onClick={() => {
                  void (editingPerson ? updatePerson() : addPerson())
                }}
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
                  onChange={(e) => setItemCategory(Number(e.target.value))}
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
                onClick={() => {
                  void (editingItem ? updateItem() : addItem())
                }}
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
                onClick={() => {
                  void addCategory()
                }}
                disabled={!categoryName.trim()}
              >
                Add
              </Button>
            </DialogActions>
          </Dialog>

          {/* Required Item Dialog */}
          <Dialog 
            open={openRequiredItemDialog} 
            onClose={() => setOpenRequiredItemDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {editingRequiredItem ? 'Edit Required Item' : 'Add Required Item'}
            </DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                label="Required Item Name"
                value={requiredItemName}
                onChange={(e) => setRequiredItemName(e.target.value)}
                margin="normal"
                autoFocus
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Category</InputLabel>
                <Select
                  value={requiredItemCategory}
                  onChange={(e) => setRequiredItemCategory(Number(e.target.value))}
                  label="Category"
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
              <Button onClick={() => setOpenRequiredItemDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRequiredItemSave}
                variant="contained"
                disabled={!requiredItemName.trim()}
              >
                {editingRequiredItem ? 'Update' : 'Add'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Assignment Dialog */}
          <Dialog
            open={openAssignmentDialog}
            onClose={() => setOpenAssignmentDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              Assign Required Item
            </DialogTitle>
            <DialogContent>
              {assigningRequiredItem && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" fontWeight="medium">
                    {assigningRequiredItem.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Category: {assigningRequiredItem.category_name}
                  </Typography>
                </Box>
              )}
              <FormControl fullWidth margin="normal">
                <InputLabel>Assign to Person</InputLabel>
                <Select
                  value={assignedPersonId}
                  onChange={(e) => {
                    const nextValue = String(e.target.value)
                    setAssignedPersonId(nextValue === '' ? '' : Number(nextValue))
                  }}
                  label="Assign to Person"
                >
                  <MenuItem value="">
                    <em>Unassign</em>
                  </MenuItem>
                  {people.map((person) => (
                    <MenuItem key={person.id} value={person.id}>
                      {person.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenAssignmentDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  void assignRequiredItem()
                }}
                variant="contained"
              >
                {assignedPersonId ? 'Assign' : 'Unassign'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  )
}

export default App
