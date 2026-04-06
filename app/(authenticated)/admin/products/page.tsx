import { prisma } from "@/lib/db/prisma"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ProductEditDialog } from "./product-edit-dialog"
import { ProductBulkActions } from "./product-bulk-actions"
import { ProductFilters } from "./product-filters"

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; stockStatus?: string; page?: string }>
}) {
  const params = await searchParams
  const brandFilter = params.brand || ""
  const stockFilter = params.stockStatus || ""
  const page = parseInt(params.page || "1", 10)
  const pageSize = 50

  const where: Record<string, unknown> = {}
  if (brandFilter) {
    where.brand = { contains: brandFilter, mode: "insensitive" }
  }
  if (stockFilter) {
    where.stockStatus = stockFilter
  }

  const [products, totalCount, brands] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        brand: true,
        itemName: true,
        garmentType: true,
        stockStatus: true,
        linkAlive: true,
        affiliateUrl: true,
        post: { select: { title: true, slug: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.product.groupBy({
      by: ["brand"],
      where: { brand: { not: null } },
      _count: true,
      orderBy: { _count: { brand: "desc" } },
      take: 50,
    }),
  ])

  const totalPages = Math.ceil(totalCount / pageSize)
  const brandList = brands
    .filter((b) => b.brand)
    .map((b) => ({ name: b.brand!, count: b._count }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Badge variant="secondary">{totalCount} products</Badge>
      </div>

      <ProductFilters
        brands={brandList}
        currentBrand={brandFilter}
        currentStockStatus={stockFilter}
      />

      <ProductBulkActions />

      <div className="border rounded-lg mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input type="checkbox" className="product-select-all" />
              </TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Link</TableHead>
              <TableHead>Look</TableHead>
              <TableHead className="w-16">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} data-product-id={product.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    className="product-checkbox"
                    data-id={product.id}
                  />
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {product.brand || "—"}
                </TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">
                  {product.itemName || "—"}
                </TableCell>
                <TableCell>
                  {product.garmentType ? (
                    <Badge variant="outline" className="text-xs">
                      {product.garmentType}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <StockBadge status={product.stockStatus} />
                </TableCell>
                <TableCell>
                  {product.linkAlive ? (
                    <Badge variant="outline" className="text-xs text-green-600">
                      alive
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      dead
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                  {product.post.title}
                </TableCell>
                <TableCell>
                  <ProductEditDialog
                    product={{
                      id: product.id,
                      brand: product.brand,
                      itemName: product.itemName,
                      garmentType: product.garmentType,
                      stockStatus: product.stockStatus,
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {page > 1 && (
            <a
              href={`/admin/products?page=${page - 1}${brandFilter ? `&brand=${brandFilter}` : ""}${stockFilter ? `&stockStatus=${stockFilter}` : ""}`}
              className="px-3 py-1 border rounded text-sm hover:bg-muted"
            >
              Prev
            </a>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/admin/products?page=${page + 1}${brandFilter ? `&brand=${brandFilter}` : ""}${stockFilter ? `&stockStatus=${stockFilter}` : ""}`}
              className="px-3 py-1 border rounded text-sm hover:bg-muted"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function StockBadge({ status }: { status: string }) {
  if (status === "available") {
    return <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">available</Badge>
  }
  if (status === "sold_out") {
    return <Badge variant="destructive" className="text-xs">sold out</Badge>
  }
  return <Badge variant="secondary" className="text-xs">unknown</Badge>
}
