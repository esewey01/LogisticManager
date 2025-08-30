        <div className="border rounded-lg bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRows.size === products.length && products.length > 0}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      if (isChecked) {
                        setSelectedRows(new Set(products.map(p => p.sku)));
                      } else {
                        setSelectedRows(new Set());
                      }
                    }}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product: CatalogProduct) => (
                <TableRow key={product.sku} className="hover:bg-muted/30">
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.has(product.sku)}
                      onCheckedChange={(checked) => handleRowSelection(product.sku, checked as any)}
                      data-testid={`checkbox-select-${product.sku}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell>
                    {editingRow === product.sku ? (
                      <Input
                        value={editData.nombre_producto ?? product.nombre_producto ?? ''}
                        onChange={(e) => handleCatalogEdit(product.sku, 'nombre_producto', e.target.value)}
                        className="h-8"
                        data-testid={`input-edit-nombre-${product.sku}`}
                      />
                    ) : (
                      <span className="truncate max-w-xs">{product.nombre_producto}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {product.categoria || 'Sin categoría'}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.marca_producto}</TableCell>
                  <TableCell>
                    <Badge variant={(product.stock ?? 0) > 0 ? 'default' : 'destructive'}>
                      {product.stock ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingRow === product.sku ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editData.costo ?? product.costo ?? ''}
                        onChange={(e) => handleCatalogEdit(product.sku, 'costo', parseFloat(e.target.value))}
                        className="h-8 w-24"
                        data-testid={`input-edit-costo-${product.sku}`}
                      />
                    ) : (
                      <span>${(product.costo ?? 0).toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingRow === product.sku ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCatalogSave(product.sku)}
                          disabled={updateCatalogMutation.isPending}
                          data-testid={`button-save-${product.sku}`}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingRow(null);
                            setEditData({});
                          }}
                          data-testid={`button-cancel-${product.sku}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingRow(product.sku);
                          setEditData({});
                        }}
                        data-testid={`button-edit-${product.sku}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Mostrando {((catalogPage - 1) * pageSize) + 1} a {Math.min(catalogPage * pageSize, total)} de {total} productos
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCatalogPage(p => Math.max(1, p - 1))}
              disabled={catalogPage === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCatalogPage(p => p + 1)}
              disabled={catalogPage * pageSize >= total}
              data-testid="button-next-page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderShopifyTable = () => {
    if (shopifyLoading) {
      return <div className="p-8 text-center">Cargando productos de Shopify...</div>;
    }

    const products = shopifyData?.rows ?? [];
    const total = shopifyData?.total ?? 0;

    return (
      <div className="space-y-4">
        {/* Barra de herramientas Shopify */}
        <div className="flex flex-wrap gap-2 items-center justify-between bg-muted/30 p-3 rounded-lg">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en Shopify..."
                className="w-48 h-8"
                onChange={(e) => debouncedSearch(e.target.value)}
                data-testid="input-search-shopify"
              />
            </div>

            <Select
              value={shopifyFilters.shopId}
              onValueChange={(value) => setShopifyFilters(prev => ({ ...prev, shopId: value }))}
            >
              <SelectTrigger className="w-32 h-8" data-testid="select-shop">
                <SelectValue placeholder="Tienda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                <SelectItem value="1">WordWide</SelectItem>
                <SelectItem value="2">CrediTienda</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={shopifyFilters.status}
              onValueChange={(value) => setShopifyFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-32 h-8" data-testid="select-status">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" data-testid="button-sync-shopify">
              <Package className="w-4 h-4 mr-1" />
              Sincronizar
            </Button>
            <Button size="sm" variant="outline" data-testid="button-export-shopify">
              <Download className="w-4 h-4 mr-1" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Tabla Shopify */}
        <div className="border rounded-lg bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Tienda</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Precio Comparación</TableHead>
                <TableHead>Inventario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product: ShopifyProduct) => (
                <TableRow key={`${product.product_id}-${product.variant_id}`} className="hover:bg-muted/30">
                  <TableCell>
                    <Badge variant="outline">
                      {product.shop_name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium truncate max-w-xs">{product.title}</div>
                      {product.vendor && (
                        <div className="text-xs text-muted-foreground">{product.vendor}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell>
                    {editingRow === `${product.variant_id}` ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editData.price ?? product.price ?? ''}
                        onChange={(e) => handleShopifyEdit(product.variant_id, 'price', parseFloat(e.target.value))}
                        className="h-8 w-24"
                        data-testid={`input-edit-price-${product.variant_id}`}
                      />
                    ) : (
                      <span>${(product.price ?? 0).toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingRow === `${product.variant_id}` ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editData.compare_at_price ?? product.compare_at_price ?? ''}
                        onChange={(e) => handleShopifyEdit(product.variant_id, 'compare_at_price', parseFloat(e.target.value))}
                        className="h-8 w-24"
                        data-testid={`input-edit-compare-price-${product.variant_id}`}
                      />
                    ) : (
                      <span>${product.compare_at_price != null ? product.compare_at_price.toFixed(2) : '—'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={(product.inventory_qty ?? 0) > 0 ? 'default' : 'destructive'}>
                      {product.inventory_qty ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.product_status === 'active' ? 'default' : 'secondary'}>
                      {product.product_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingRow === `${product.variant_id}` ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleShopifySave(product.variant_id)}
                          disabled={updateShopifyMutation.isPending}
                          data-testid={`button-save-shopify-${product.variant_id}`}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingRow(null);
                            setEditData({});
                          }}
                          data-testid={`button-cancel-shopify-${product.variant_id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingRow(`${product.variant_id}`);
                          setEditData({});
                        }}
                        data-testid={`button-edit-shopify-${product.variant_id}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Paginación Shopify */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Mostrando {((shopifyPage - 1) * pageSize) + 1} a {Math.min(shopifyPage * pageSize, total)} de {total} productos
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShopifyPage(p => Math.max(1, p - 1))}
              disabled={shopifyPage === 1}
              data-testid="button-prev-page-shopify"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShopifyPage(p => p + 1)}
              disabled={shopifyPage * pageSize >= total}
              data-testid="button-next-page-shopify"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderReconciliationTab = () => {
    const stats = reconciliationStats;
    const unlinked = unlinkedCatalog?.rows ?? [];

    return (
      <div className="space-y-6">
        {/* KPIs de conciliación */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Productos Emparejados</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                {stats?.emparejados ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sin Vincular</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">
                {stats?.faltantes ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Conflictos</CardDescription>
              <CardTitle className="text-2xl text-red-600">
                {stats?.conflictos ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Productos sin vincular del catálogo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Productos en Catálogo sin Vincular
            </CardTitle>
            <CardDescription>
              Estos productos existen en el catálogo pero no están vinculados con Shopify
