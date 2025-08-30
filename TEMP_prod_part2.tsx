      queryClient.invalidateQueries({ queryKey: ['/api/unified-products/catalog'] });
      setEditingRow(null);
      setEditData({});
    },
    onError: () => {
      toast({ variant: 'destructive', description: 'Error al actualizar producto' });
    }
  });

  // ================ SHOPIFY QUERIES ================

  const { data: shopifyData, isLoading: shopifyLoading } = useQuery<ShopifyApiResponse>({
    queryKey: ['/api/unified-products/shopify', shopifyPage, searchTerm, shopifyFilters],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(shopifyPage),
        pageSize: String(pageSize),
        ...(searchTerm ? { search: searchTerm } : {}),
        ...(shopifyFilters.shopId ? { shopId: shopifyFilters.shopId } : {}),
        ...(shopifyFilters.status ? { status: shopifyFilters.status } : {}),
        ...(shopifyFilters.vendor ? { vendor: shopifyFilters.vendor } : {}),
        ...(shopifyFilters.productType ? { productType: shopifyFilters.productType } : {}),
      });
      return apiRequest('GET', `/api/unified-products/shopify?${params.toString()}`).then(res => res.json());
    },
    enabled: activeTab === 'shopify'
  });

  const updateShopifyMutation = useMutation({
    mutationFn: ({ variantId, updates }: { variantId: number; updates: Partial<ShopifyProduct> }) =>
      apiRequest(
        'PATCH',
        `/api/unified-products/shopify/variant/${variantId}`,
        updates
      ).then(res => res.json()),
    onSuccess: () => {
      toast({ description: 'Variante actualizada correctamente' });
      queryClient.invalidateQueries({ queryKey: ['/api/unified-products/shopify'] });
      setEditingRow(null);
      setEditData({});
    },
    onError: () => {
      toast({ variant: 'destructive', description: 'Error al actualizar variante' });
    }
  });

  // ================ CONCILIACIÓN QUERIES ================

  const { data: reconciliationStats } = useQuery<ReconciliationStats>({
    queryKey: ['/api/unified-products/reconciliation/stats'],
    queryFn: () =>
      apiRequest('GET', '/api/unified-products/reconciliation/stats').then(res => res.json()),
    enabled: activeTab === 'conciliacion'
  });

  const { data: unlinkedCatalog } = useQuery<UnlinkedCatalogResponse>({
    queryKey: ['/api/unified-products/reconciliation/unlinked/catalog', reconciliationPage],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(reconciliationPage), pageSize: String(pageSize) });
      return apiRequest('GET', `/api/unified-products/reconciliation/unlinked/catalog?${params.toString()}`).then(res => res.json());
    },
    enabled: activeTab === 'conciliacion'
  });

  // ================ HANDLERS ================

  const handleCatalogEdit = (sku: string, field: string, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleCatalogSave = (sku: string) => {
    if (Object.keys(editData).length === 0) {
      setEditingRow(null);
      return;
    }
    updateCatalogMutation.mutate({ sku, updates: editData });
  };

  const handleShopifyEdit = (variantId: number, field: string, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleShopifySave = (variantId: number) => {
    if (Object.keys(editData).length === 0) {
      setEditingRow(null);
      return;
    }
    updateShopifyMutation.mutate({ variantId, updates: editData });
  };

  const handleRowSelection = (id: string, checked: boolean | 'indeterminate') => {
    const isChecked = checked === true;
    setSelectedRows((prev: Set<string>) => {
      const newSet = new Set(prev);
      if (isChecked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleBulkEdit = () => {
    if (selectedRows.size === 0) {
      toast({ variant: 'destructive', description: 'Selecciona al menos un producto' });
      return;
    }
    // Implementar edición masiva
    toast({ description: `Editando ${selectedRows.size} productos seleccionados` });
  };

  // ================ RENDER COMPONENTS ================

  const renderCatalogTable = () => {
    if (catalogLoading) {
      return <div className="p-8 text-center">Cargando productos del catálogo...</div>;
    }

    const products = catalogData?.rows ?? [];
    const total = catalogData?.total ?? 0;

    return (
      <div className="space-y-4">
        {/* Barra de herramientas compacta */}
        <div className="flex flex-wrap gap-2 items-center justify-between bg-muted/30 p-3 rounded-lg">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                className="w-48 h-8"
                onChange={(e) => debouncedSearch(e.target.value)}
                data-testid="input-search-catalog"
              />
            </div>

            <Select value={searchField} onValueChange={setSearchField}>
              <SelectTrigger className="w-40 h-8" data-testid="select-search-field">
                <SelectValue placeholder="Campo de búsqueda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los campos</SelectItem>
                <SelectItem value="sku">SKU</SelectItem>
                <SelectItem value="sku_interno">SKU Interno</SelectItem>
                <SelectItem value="codigo_barras">Código de Barras</SelectItem>
                <SelectItem value="nombre_producto">Nombre</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={catalogFilters.categoria}
              onValueChange={(value) => setCatalogFilters(prev => ({ ...prev, categoria: value }))}
            >
              <SelectTrigger className="w-32 h-8" data-testid="select-categoria">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {catalogFacets?.categorias?.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={catalogFilters.marca}
              onValueChange={(value) => setCatalogFilters(prev => ({ ...prev, marca: value }))}
            >
              <SelectTrigger className="w-32 h-8" data-testid="select-marca">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {catalogFacets?.marcas?.map(marca => (
                  <SelectItem key={marca} value={marca}>{marca}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-center">
            {selectedRows.size > 0 && (
              <Button size="sm" variant="outline" onClick={handleBulkEdit} data-testid="button-bulk-edit">
                <Edit3 className="w-4 h-4 mr-1" />
                Editar ({selectedRows.size})
              </Button>
            )}
            <Button size="sm" variant="outline" data-testid="button-export">
              <Download className="w-4 h-4 mr-1" />
              Exportar
            </Button>
            <Button size="sm" variant="outline" data-testid="button-import">
              <Upload className="w-4 h-4 mr-1" />
              Importar
            </Button>
          </div>
        </div>

        {/* Tabla virtualizada */}
