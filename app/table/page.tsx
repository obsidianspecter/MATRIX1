// components/TablePage.tsx
"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// Removed the import for 'uuid' as it cannot find the module
import { Trash2, Edit2, Save, X, Trash } from "lucide-react" // Icon library
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

interface TableData {
  id: string
  name: string
  age: number
  email: string
}

export default function TablePage() {
  // **State Management**
  const [data, setData] = useState<TableData[]>([])
  const [newRow, setNewRow] = useState<Omit<TableData, "id">>({
    name: "",
    age: 0,
    email: "",
  })
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editingRowData, setEditingRowData] = useState<Omit<TableData, "id">>({
    name: "",
    age: 0,
    email: "",
  })
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [sortConfig, setSortConfig] = useState<{
    key: keyof TableData
    direction: "ascending" | "descending"
  } | null>(null)

  // **Persist Data to Local Storage**
  useEffect(() => {
    const storedData = localStorage.getItem("tableData")
    if (storedData) {
      setData(JSON.parse(storedData))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("tableData", JSON.stringify(data))
  }, [data])

  // **Form Validation**
  const validateRow = (
    row: Omit<TableData, "id">
  ): { valid: boolean; errors: Partial<Record<keyof typeof row, string>> } => {
    const errors: Partial<Record<keyof typeof row, string>> = {}
    if (!row.name.trim()) {
      errors.name = "Name is required."
    }
    if (!row.email.trim()) {
      errors.email = "Email is required."
    } else if (!/\S+@\S+\.\S+/.test(row.email)) {
      errors.email = "Email is invalid."
    }
    if (row.age <= 0) {
      errors.age = "Age must be a positive number."
    }
    return { valid: Object.keys(errors).length === 0, errors }
  }

  // **Handle Input Change for New Row**
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target
    setNewRow((prev) => ({
      ...prev,
      [name]: name === "age" ? Number(value) : value,
    }))
  }

  // **Handle Adding a New Row**
  const handleAddRow = () => {
    const { valid, errors } = validateRow(newRow)
    if (!valid) {
      Object.values(errors).forEach((error) => toast.error(error))
      return
    }
    const newEntry: TableData = { ...newRow, id: uuidv4() }
    setData((prev) => [...prev, newEntry])
    setNewRow({ name: "", age: 0, email: "" })
    toast.success("Row added successfully!")
  }

  // **Handle Deleting a Row**
  const handleDeleteRow = (id: string) => {
    if (window.confirm("Are you sure you want to delete this row?")) {
      setData((prev) => prev.filter((row) => row.id !== id))
      toast.info("Row deleted.")
    }
  }

  // **Handle Deleting the Entire Table**
  const handleDeleteTable = () => {
    if (
      data.length === 0 ||
      window.confirm(
        "Are you sure you want to delete the entire table? This action cannot be undone."
      )
    ) {
      setData([])
      localStorage.removeItem("tableData") // Clear local storage
      toast.warn("All table data has been deleted.")
    }
  }

  // **Handle Editing a Row**
  const handleEditRow = (id: string) => {
    const row = data.find((row) => row.id === id)
    if (row) {
      setEditingRowId(id)
      setEditingRowData({ name: row.name, age: row.age, email: row.email })
    }
  }

  // **Handle Cancel Editing**
  const handleCancelEdit = () => {
    setEditingRowId(null)
    setEditingRowData({ name: "", age: 0, email: "" })
  }

  // **Handle Save Edited Row**
  const handleSaveEdit = (id: string) => {
    const { valid, errors } = validateRow(editingRowData)
    if (!valid) {
      Object.values(errors).forEach((error) => toast.error(error))
      return
    }
    setData((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...editingRowData } : row))
    )
    setEditingRowId(null)
    setEditingRowData({ name: "", age: 0, email: "" })
    toast.success("Row updated successfully!")
  }

  // **Handle Search Query Change**
  const handleSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSearchQuery(e.target.value)
  }

  // **Handle Sorting**
  const handleSort = (key: keyof TableData) => {
    let direction: "ascending" | "descending" = "ascending"
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  // **Sort Data**
  const sortedData = React.useMemo(() => {
    let sortableData = [...data]
    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1
        }
        return 0
      })
    }
    return sortableData
  }, [data, sortConfig])

  // **Filter Data**
  const filteredData = sortedData.filter(
    (row) =>
      row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Toast Notifications */}
      <ToastContainer />

      {/* Page Title */}
      <h1 className="text-3xl font-bold mb-8 text-center">Data Table</h1>

      {/* New Row Form */}
      <div className="mb-6 p-4 bg-white shadow rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Add New Row</h2>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Input
            type="text"
            name="name"
            placeholder="Name"
            value={newRow.name}
            onChange={handleInputChange}
            className="w-full sm:w-1/4"
            aria-label="Name"
          />
          <Input
            type="number"
            name="age"
            placeholder="Age"
            value={newRow.age === 0 ? "" : newRow.age}
            onChange={handleInputChange}
            className="w-full sm:w-1/4"
            aria-label="Age"
          />
          <Input
            type="email"
            name="email"
            placeholder="Email"
            value={newRow.email}
            onChange={handleInputChange}
            className="w-full sm:w-1/4"
            aria-label="Email"
          />
          <Button onClick={handleAddRow} aria-label="Add Row">
            Add Row
          </Button>
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <Input
          type="text"
          placeholder="Search by Name or Email"
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full sm:w-1/3"
          aria-label="Search"
        />

        {/* Sort Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleSort("name")}
            variant={sortConfig?.key === "name" ? "default" : "outline"}
            aria-label="Sort by Name"
          >
            Sort by Name{" "}
            {sortConfig?.key === "name"
              ? sortConfig.direction === "ascending"
                ? "↑"
                : "↓"
              : ""}
          </Button>
          <Button
            onClick={() => handleSort("age")}
            variant={sortConfig?.key === "age" ? "default" : "outline"}
            aria-label="Sort by Age"
          >
            Sort by Age{" "}
            {sortConfig?.key === "age"
              ? sortConfig.direction === "ascending"
                ? "↑"
                : "↓"
              : ""}
          </Button>
          <Button
            onClick={() => handleSort("email")}
            variant={sortConfig?.key === "email" ? "default" : "outline"}
            aria-label="Sort by Email"
          >
            Sort by Email{" "}
            {sortConfig?.key === "email"
              ? sortConfig.direction === "ascending"
                ? "↑"
                : "↓"
              : ""}
          </Button>
        </div>
      </div>

      {/* Delete Entire Table Button */}
      <div className="mb-4 flex justify-end">
        <Button
          onClick={handleDeleteTable}
          variant="destructive"
          className="flex items-center gap-2"
          aria-label="Delete Entire Table"
        >
          <Trash size={16} /> Delete Table
        </Button>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">ID</th>
              <th className="border border-gray-300 p-2">Name</th>
              <th className="border border-gray-300 p-2">Age</th>
              <th className="border border-gray-300 p-2">Email</th>
              <th className="border border-gray-300 p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {/* ID */}
                  <td className="border border-gray-300 p-2">{row.id}</td>

                  {/* Name */}
                  <td className="border border-gray-300 p-2">
                    {editingRowId === row.id ? (
                      <Input
                        type="text"
                        name="name"
                        value={editingRowData.name}
                        onChange={(e) =>
                          setEditingRowData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full"
                        aria-label="Edit Name"
                      />
                    ) : (
                      row.name
                    )}
                  </td>

                  {/* Age */}
                  <td className="border border-gray-300 p-2">
                    {editingRowId === row.id ? (
                      <Input
                        type="number"
                        name="age"
                        value={editingRowData.age === 0 ? "" : editingRowData.age}
                        onChange={(e) =>
                          setEditingRowData((prev) => ({
                            ...prev,
                            age: e.target.value ? Number(e.target.value) : 0,
                          }))
                        }
                        className="w-full"
                        aria-label="Edit Age"
                      />
                    ) : (
                      row.age
                    )}
                  </td>

                  {/* Email */}
                  <td className="border border-gray-300 p-2">
                    {editingRowId === row.id ? (
                      <Input
                        type="email"
                        name="email"
                        value={editingRowData.email}
                        onChange={(e) =>
                          setEditingRowData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="w-full"
                        aria-label="Edit Email"
                      />
                    ) : (
                      row.email
                    )}
                  </td>

                  {/* Actions */}
                  <td className="border border-gray-300 p-2 flex gap-2">
                    {editingRowId === row.id ? (
                      <>
                        <Button
                          onClick={() => handleSaveEdit(row.id)}
                          className="flex items-center gap-1"
                          aria-label="Save Row"
                        >
                          <Save size={16} /> Save
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="destructive"
                          className="flex items-center gap-1"
                          aria-label="Cancel Edit"
                        >
                          <X size={16} /> Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleEditRow(row.id)}
                          variant="ghost"
                          className="flex items-center gap-1"
                          aria-label="Edit Row"
                        >
                          <Edit2 size={16} /> Edit
                        </Button>
                        <Button
                          onClick={() => handleDeleteRow(row.id)}
                          variant="destructive"
                          className="flex items-center gap-1"
                          aria-label="Delete Row"
                        >
                          <Trash2 size={16} /> Delete
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center p-4">
                  No data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
function uuidv4(): string {
  throw new Error("Function not implemented.")
}

