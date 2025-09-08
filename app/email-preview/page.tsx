"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, TrendingUp, TrendingDown, CheckCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function EmailPreviewPage() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile-optimized container */}
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Email Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 p-1">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <Mail className="w-6 h-6" />
            <span className="font-semibold">Customer Whisperer</span>
          </div>
          <h1 className="text-xl font-bold mb-1">This Week's Feedback</h1>
          <p className="text-purple-100 text-sm">{currentDate}</p>
        </div>

        {/* Email Content */}
        <div className="p-4 space-y-4">
          {/* Weekly Summary */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Weekly Summary for Acme Coffee Shop</h2>
            <p className="text-sm text-gray-600">Here's what your customers are saying this week</p>
          </div>

          {/* Top Complaints Section */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-800">
                <TrendingDown className="w-5 h-5" />
                Top Complaints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="destructive" className="text-xs">
                  Slow service
                </Badge>
                <span className="text-xs text-red-600">8 mentions</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="destructive" className="text-xs">
                  Cold coffee
                </Badge>
                <span className="text-xs text-red-600">5 mentions</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="destructive" className="text-xs">
                  Limited seating
                </Badge>
                <span className="text-xs text-red-600">3 mentions</span>
              </div>
            </CardContent>
          </Card>

          {/* Customer Praise Section */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <TrendingUp className="w-5 h-5" />
                Customer Praise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-green-600 hover:bg-green-700 text-xs">Friendly staff</Badge>
                <span className="text-xs text-green-600">12 mentions</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge className="bg-green-600 hover:bg-green-700 text-xs">Great atmosphere</Badge>
                <span className="text-xs text-green-600">9 mentions</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge className="bg-green-600 hover:bg-green-700 text-xs">Quality pastries</Badge>
                <span className="text-xs text-green-600">7 mentions</span>
              </div>
            </CardContent>
          </Card>

          {/* AI Action Suggestions Section */}
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <CheckCircle className="w-5 h-5" />
                AI Action Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Train staff on faster service protocols</p>
                  <p className="text-xs text-gray-600">Address the most common complaint about slow service</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Check coffee temperature standards</p>
                  <p className="text-xs text-gray-600">Ensure drinks are served at optimal temperature</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Highlight friendly staff in marketing</p>
                  <p className="text-xs text-gray-600">Leverage your strongest positive feedback</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center pt-4 pb-6">
            <p className="text-xs text-gray-500 mb-3">
              This summary was generated by AI based on your recent customer feedback.
            </p>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
            >
              View Full Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
