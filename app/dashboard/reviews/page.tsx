"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Star, ArrowLeft } from "lucide-react"
import Link from "next/link"

const mockReviews = [
  {
    id: 1,
    timestamp: "2024-01-15T10:30:00Z",
    rating: 5,
    source: "Google Reviews",
    text: "Absolutely love this service! The customer support team went above and beyond to help me resolve my issue. Highly recommend!",
    sentiment: "positive",
  },
  {
    id: 2,
    timestamp: "2024-01-14T16:45:00Z",
    rating: 2,
    source: "Yelp",
    text: "Very disappointed with the quality. The product arrived damaged and customer service was unhelpful. Will not be ordering again.",
    sentiment: "negative",
  },
  {
    id: 3,
    timestamp: "2024-01-14T09:15:00Z",
    rating: 4,
    source: "Facebook",
    text: "Good experience overall. The delivery was fast and the product quality is decent. Could improve packaging though.",
    sentiment: "positive",
  },
  {
    id: 4,
    timestamp: "2024-01-13T14:20:00Z",
    rating: 1,
    source: "Google Reviews",
    text: "Terrible experience. Order was delayed by 2 weeks with no communication. When it finally arrived, it was the wrong item.",
    sentiment: "negative",
  },
  {
    id: 5,
    timestamp: "2024-01-13T11:30:00Z",
    rating: 5,
    source: "Trustpilot",
    text: "Excellent service! Quick response time and very professional staff. The product exceeded my expectations.",
    sentiment: "positive",
  },
  {
    id: 6,
    timestamp: "2024-01-12T13:45:00Z",
    rating: 3,
    source: "Yelp",
    text: "Average experience. Nothing special but nothing terrible either. Product works as expected.",
    sentiment: "neutral",
  },
]

export default function ReviewFeedPage() {
  const [sortBy, setSortBy] = useState("newest")
  const [filterBy, setFilterBy] = useState("all")

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
    ))
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 text-green-800 border-green-200"
      case "negative":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const filteredAndSortedReviews = mockReviews
    .filter((review) => {
      if (filterBy === "all") return true
      return review.sentiment === filterBy
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        case "oldest":
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        case "highest":
          return b.rating - a.rating
        case "lowest":
          return a.rating - b.rating
        default:
          return 0
      }
    })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Review Feed</h1>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="highest">Highest Rating</SelectItem>
                <SelectItem value="lowest">Lowest Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by sentiment</label>
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reviews</SelectItem>
                <SelectItem value="positive">Most Positive</SelectItem>
                <SelectItem value="negative">Most Negative</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {filteredAndSortedReviews.map((review) => (
            <Card key={review.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">{renderStars(review.rating)}</div>
                    <Badge variant="outline" className="text-xs">
                      {review.source}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${getSentimentColor(review.sentiment)}`}>
                      {review.sentiment}
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-500">{formatDate(review.timestamp)}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{review.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredAndSortedReviews.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No reviews found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
