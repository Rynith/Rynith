"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, BarChart3, Settings, LogOut, RefreshCw, FileText, Menu, X } from "lucide-react"

type Props = { userEmail: string }

export default function DashboardClient({ userEmail }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)

  const router = useRouter()
  const supabase = supabaseBrowser()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth")
    router.refresh()
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1500)
  }

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !!checked }))
  }

  const topComplaints = [
    "Long wait times during lunch rush",
    "Limited parking availability",
    "Menu items frequently out of stock",
    "Slow WiFi connection",
    "Noisy dining environment",
  ]

  const customerPraise = [
    "Excellent customer service",
    "Fresh and delicious food",
    "Clean and welcoming atmosphere",
    "Great value for money",
    "Friendly and helpful staff",
    "Quick delivery service",
  ]

  const aiSuggestions = [
    { id: "1", text: "Add online reservation system to reduce wait times" },
    { id: "2", text: "Partner with nearby parking garage for customer discounts" },
    { id: "3", text: "Implement inventory management system for menu items" },
    { id: "4", text: "Upgrade WiFi infrastructure for better connectivity" },
    { id: "5", text: "Consider acoustic panels to reduce noise levels" },
  ]

  
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#6A0DAD] to-[#7B3AED] flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-[#1A1A1A]">Dashboard</span>
          </div>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="p-4 space-y-2">
          <Button variant="ghost" className="w-full justify-start bg-[#F3F0FF] text-[#6A0DAD]">
            <BarChart3 className="h-4 w-4 mr-3" />
            Weekly Summary
          </Button>
          <Button variant="ghost" className="w-full justify-start text-[#666666] hover:text-[#1A1A1A]">
            <FileText className="h-4 w-4 mr-3" />
            Reports
          </Button>
          <Button variant="ghost" className="w-full justify-start text-[#666666] hover:text-[#1A1A1A]">
            <Settings className="h-4 w-4 mr-3" />
            Settings
          </Button>
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 lg:ml-0">
        <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#6A0DAD] to-[#7B3AED] flex items-center justify-center lg:hidden">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <span className="text-xl font-bold text-[#1A1A1A] lg:hidden">Customer Whisperer</span>
                <span className="text-xl font-bold text-[#1A1A1A] hidden lg:block">Weekly Summary</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-sm text-[#666]">
                Logged in as <span className="font-medium text-[#1A1A1A]">{userEmail}</span>
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="border-[#6A0DAD] text-[#6A0DAD] hover:bg-[#F3F0FF] bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh Feedback
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Weekly Summary</h1>
            <p className="text-[#666666]">Your customer feedback insights for this week</p>
          </div>

          {/* Three Key Sections */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Top Complaints */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <CardTitle className="text-[#1A1A1A] flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Top Complaints</span>
                </CardTitle>
                <CardDescription className="text-[#666666]">Most mentioned issues this week</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topComplaints.map((complaint, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
                      {index + 1}
                    </Badge>
                    <p className="text-sm text-[#1A1A1A] leading-relaxed">{complaint}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Customer Praise */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <CardTitle className="text-[#1A1A1A] flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Customer Praise</span>
                </CardTitle>
                <CardDescription className="text-[#666666]">What customers love about you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {customerPraise.map((praise, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">★</Badge>
                    <p className="text-sm text-[#1A1A1A] leading-relaxed">{praise}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* AI Action Suggestions */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <CardTitle className="text-[#1A1A1A] flex items-center space-x-2">
                  <div className="w-3 h-3 bg-[#6A0DAD] rounded-full"></div>
                  <span>AI Action Suggestions</span>
                </CardTitle>
                <CardDescription className="text-[#666666]">Recommended actions to improve</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={suggestion.id}
                      checked={checkedItems[suggestion.id] || false}
                      onCheckedChange={(checked) => handleCheckboxChange(suggestion.id, checked as boolean)}
                      className="mt-1 border-[#6A0DAD] data-[state=checked]:bg-[#6A0DAD]"
                    />
                    <label
                      htmlFor={suggestion.id}
                      className={`text-sm leading-relaxed cursor-pointer ${
                        checkedItems[suggestion.id] ? "text-[#666666] line-through" : "text-[#1A1A1A]"
                      }`}
                    >
                      {suggestion.text}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
