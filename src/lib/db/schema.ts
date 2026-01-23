import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  decimal,
  boolean,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// AUTENTICAÇÃO (Auth.js compatible)
// ============================================================================

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified'),
  image: text('image'),
  password: text('password'), // Para auth com credentials
  role: varchar('role', { length: 20 }).notNull().default('customer'), // admin, member, customer
  phone: varchar('phone', { length: 20 }), // Telefone (billing_phone do WP)
  resetToken: text('reset_token'), // Token para reset de senha
  resetTokenExpiry: timestamp('reset_token_expiry'), // Expiração do token
  // Campos para migração do WordPress (MANTER para autenticação)
  legacyPasswordHash: text('legacy_password_hash'), // Hash phpass do WordPress
  legacyPasswordType: varchar('legacy_password_type', { length: 50 }), // 'wordpress_phpass'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  account => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires').notNull(),
  },
  vt => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// ============================================================================
// E-COMMERCE CORE
// ============================================================================

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  parentId: uuid('parent_id'), // Para subcategorias - self-reference
  icon: varchar('icon', { length: 500 }), // URL da imagem ou emoji
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  shortDescription: text('short_description'),
  categoryId: uuid('category_id').references(() => categories.id),
  isActive: boolean('is_active').default(true).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  fileType: varchar('file_type', { length: 50 }).default('pdf').notNull(), // 'pdf' ou 'png'
  seoTitle: varchar('seo_title', { length: 255 }),
  seoDescription: text('seo_description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ⭐ Tabela separada para ordem customizada de exibição dos produtos
// NÃO modifica a tabela products, preserva created_at original
export const productDisplayOrder = pgTable('product_display_order', {
  productId: uuid('product_id')
    .primaryKey()
    .references(() => products.id, { onDelete: 'cascade' }),
  displayOrder: integer('display_order').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela de junção para múltiplas categorias por produto
export const productCategories = pgTable(
  'product_categories',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    isPrimary: boolean('is_primary').default(false), // categoria principal
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.productId, table.categoryId] }),
  })
);

export const productVariations = pgTable('product_variations', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const files = pgTable('files', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
  variationId: uuid('variation_id').references(() => productVariations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(), // bytes
  path: text('path').notNull(), // caminho no R2
  hash: varchar('hash', { length: 64 }), // SHA-256 para verificação
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const productImages = pgTable('product_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
  variationId: uuid('variation_id').references(() => productVariations.id, { onDelete: 'cascade' }),
  cloudinaryId: text('cloudinary_id').notNull(), // public_id do Cloudinary
  url: text('url').notNull(), // URL segura da imagem no Cloudinary
  width: integer('width'), // largura da imagem
  height: integer('height'), // altura da imagem
  format: varchar('format', { length: 10 }), // webp, jpg, png, etc.
  size: integer('size'), // bytes
  alt: varchar('alt', { length: 255 }), // texto alternativo para acessibilidade
  sortOrder: integer('sort_order').default(0),
  isMain: boolean('is_main').default(false), // imagem principal do produto/variação
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// INTERNACIONALIZAÇÃO (i18n)
// ============================================================================

export const categoryI18n = pgTable(
  'category_i18n',
  {
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 5 }).notNull(), // pt, en, es
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    slug: varchar('slug', { length: 255 }).notNull(), // slug traduzido
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: text('seo_description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.categoryId, table.locale] }),
  })
);

export const productI18n = pgTable(
  'product_i18n',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 5 }).notNull(), // pt, en, es
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(), // slug traduzido
    description: text('description'),
    shortDescription: text('short_description'),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: text('seo_description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.productId, table.locale] }),
  })
);

export const productVariationI18n = pgTable(
  'product_variation_i18n',
  {
    variationId: uuid('variation_id')
      .notNull()
      .references(() => productVariations.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 5 }).notNull(), // pt, en, es
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(), // slug traduzido
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.variationId, table.locale] }),
  })
);

export const attributeI18n = pgTable(
  'attribute_i18n',
  {
    attributeId: uuid('attribute_id')
      .notNull()
      .references(() => attributes.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 5 }).notNull(), // pt, en, es
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(), // slug traduzido
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.attributeId, table.locale] }),
  })
);

export const attributeValueI18n = pgTable(
  'attribute_value_i18n',
  {
    valueId: uuid('value_id')
      .notNull()
      .references(() => attributeValues.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 5 }).notNull(), // pt, en, es
    value: varchar('value', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(), // slug traduzido
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.valueId, table.locale] }),
  })
);

// ============================================================================
// PEDIDOS
// ============================================================================

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id),
  email: varchar('email', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, processing, completed, cancelled, refunded
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  paymentProvider: varchar('payment_provider', { length: 50 }), // stripe, paypal, pix
  paymentId: varchar('payment_id', { length: 255 }), // ID do pagamento no provider
  paymentStatus: varchar('payment_status', { length: 50 }),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }).unique(), // Para idempotência
  paypalOrderId: varchar('paypal_order_id', { length: 255 }).unique(), // Para idempotência PayPal
  couponCode: varchar('coupon_code', { length: 100 }), // Código do cupom aplicado

  // Rastreamento de Afiliados
  affiliateId: uuid('affiliate_id').references(() => affiliates.id),
  affiliateLinkId: uuid('affiliate_link_id').references(() => affiliateLinks.id),

  // Controle de acesso aos produtos digitais
  accessDays: integer('access_days').default(30), // Dias de acesso específico para este pedido (null = usar configuração global)

  wpOrderId: integer('wp_order_id'), // ID do pedido no WordPress (para migração)
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id), // NULLABLE para permitir items históricos do WordPress
  variationId: uuid('variation_id').references(() => productVariations.id),
  name: varchar('name', { length: 255 }).notNull(), // snapshot do nome
  price: decimal('price', { precision: 10, scale: 2 }).notNull(), // snapshot do preço
  quantity: integer('quantity').notNull().default(1),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  wpItemId: integer('wp_item_id'), // WordPress original item_id
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// DOWNLOADS E ACESSO
// ============================================================================

// Permissões de download - quem pode baixar quais produtos
export const downloadPermissions = pgTable('download_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  userId: text('user_id').references(() => users.id),
  orderItemId: uuid('order_item_id')
    .notNull()
    .references(() => orderItems.id, { onDelete: 'cascade' }),

  // Controle de acesso
  downloadsRemaining: integer('downloads_remaining'), // null = ilimitado
  accessGrantedAt: timestamp('access_granted_at').defaultNow().notNull(),
  accessExpiresAt: timestamp('access_expires_at'), // null = nunca expira

  // Proteção de PDFs (NOVO)
  downloadLimit: integer('download_limit').default(3), // Limite de downloads permitidos
  downloadCount: integer('download_count').default(0), // Contador de downloads realizados
  watermarkEnabled: boolean('watermark_enabled').default(true).notNull(),
  watermarkText: text('watermark_text'), // Texto personalizado do watermark (email + data)

  // Informações do WordPress (para referência)
  wpOrderId: integer('wp_order_id'),
  wpProductId: integer('wp_product_id'),
  wpDownloadKey: varchar('wp_download_key', { length: 32 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Log de downloads realizados
export const downloads = pgTable('downloads', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id),
  fileId: uuid('file_id')
    .notNull()
    .references(() => files.id),
  permissionId: uuid('permission_id').references(() => downloadPermissions.id),
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),

  // Proteção de PDFs - Auditoria avançada (NOVO)
  watermarkApplied: boolean('watermark_applied').default(false),
  watermarkText: text('watermark_text'), // Snapshot do watermark aplicado
  fingerprintHash: varchar('fingerprint_hash', { length: 64 }), // Hash único do arquivo gerado

  downloadedAt: timestamp('downloaded_at').defaultNow().notNull(),
});

// ============================================================================
// CUPONS
// ============================================================================

export const coupons = pgTable('coupons', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  type: varchar('type', { length: 20 }).notNull(), // percent, fixed
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  minSubtotal: decimal('min_subtotal', { precision: 10, scale: 2 }),
  maxUses: integer('max_uses'),
  maxUsesPerUser: integer('max_uses_per_user').default(1),
  usedCount: integer('used_count').default(0),
  appliesTo: varchar('applies_to', { length: 20 }).notNull().default('all'), // all, products, variations
  allowedEmails: text('allowed_emails').array(),
  stackable: boolean('stackable').default(false),
  isActive: boolean('is_active').default(true).notNull(),
  startsAt: timestamp('starts_at'),
  endsAt: timestamp('ends_at'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const couponProducts = pgTable(
  'coupon_products',
  {
    couponId: uuid('coupon_id')
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
  },
  table => ({
    pk: primaryKey({ columns: [table.couponId, table.productId] }),
  })
);

export const couponVariations = pgTable(
  'coupon_variations',
  {
    couponId: uuid('coupon_id')
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    variationId: uuid('variation_id')
      .notNull()
      .references(() => productVariations.id, { onDelete: 'cascade' }),
  },
  table => ({
    pk: primaryKey({ columns: [table.couponId, table.variationId] }),
  })
);

export const couponRedemptions = pgTable('coupon_redemptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  couponId: uuid('coupon_id')
    .notNull()
    .references(() => coupons.id),
  userId: text('user_id').references(() => users.id),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id),
  amountDiscounted: decimal('amount_discounted', { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp('used_at').defaultNow().notNull(),
});

// ============================================================================
// PROMOÇÕES
// ============================================================================

export const promotions = pgTable('promotions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  discountType: varchar('discount_type', { length: 20 }).notNull(), // 'percentage' ou 'fixed'
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  appliesTo: varchar('applies_to', { length: 20 }).notNull(), // 'all' ou 'specific'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela de junção: promoções aplicadas a produtos específicos
export const promotionProducts = pgTable(
  'promotion_products',
  {
    promotionId: uuid('promotion_id')
      .notNull()
      .references(() => promotions.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.promotionId, table.productId] }),
  })
);

// Tabela de junção: promoções aplicadas a variações específicas
export const promotionVariations = pgTable(
  'promotion_variations',
  {
    promotionId: uuid('promotion_id')
      .notNull()
      .references(() => promotions.id, { onDelete: 'cascade' }),
    variationId: uuid('variation_id')
      .notNull()
      .references(() => productVariations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.promotionId, table.variationId] }),
  })
);

// ============================================================================
// SEO E REDIRECIONAMENTOS
// ============================================================================

export const urlMap = pgTable('url_map', {
  id: uuid('id').defaultRandom().primaryKey(),
  oldUrl: text('old_url').notNull(),
  newUrl: text('new_url').notNull(),
  statusCode: integer('status_code').notNull().default(301),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// CONVITES PARA MEMBROS
// ============================================================================

export const invites = pgTable('invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // admin, member
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  usedBy: text('used_by').references(() => users.id),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// RELAÇÕES (Drizzle Relations)
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  orders: many(orders),
  downloads: many(downloads),
  invitesCreated: many(invites, { relationName: 'inviteCreator' }),
  inviteUsed: many(invites, { relationName: 'inviteUser' }),
  cartItems: many(cartItems),
  favorites: many(favorites),
  notifications: many(notifications),
  notificationSettings: many(notificationSettings),
  affiliates: many(affiliates),
  productReviews: many(productReviews),
  reviewHelpful: many(reviewHelpful),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  productCategories: many(productCategories),
  variations: many(productVariations),
  files: many(files),
  images: many(productImages),
  orderItems: many(orderItems),
  couponProducts: many(couponProducts),
  promotionProducts: many(promotionProducts),
  translations: many(productI18n),
  reviews: many(productReviews),
  relatedProducts: many(relatedProducts, { relationName: 'productRelated' }),
  relatedByProducts: many(relatedProducts, { relationName: 'relatedByProduct' }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
  productCategories: many(productCategories),
  translations: many(categoryI18n),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, { fields: [productCategories.productId], references: [products.id] }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const productVariationsRelations = relations(productVariations, ({ one, many }) => ({
  product: one(products, { fields: [productVariations.productId], references: [products.id] }),
  files: many(files),
  images: many(productImages),
  orderItems: many(orderItems),
  couponVariations: many(couponVariations),
  promotionVariations: many(promotionVariations),
  translations: many(productVariationI18n),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  downloads: many(downloads),
  couponRedemptions: many(couponRedemptions),
  affiliateCommissions: many(affiliateCommissions),
  reviews: many(productReviews),
  affiliate: one(affiliates, { fields: [orders.affiliateId], references: [affiliates.id] }),
  affiliateLink: one(affiliateLinks, {
    fields: [orders.affiliateLinkId],
    references: [affiliateLinks.id],
  }),
  affiliateClicks: many(affiliateClicks),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variation: one(productVariations, {
    fields: [orderItems.variationId],
    references: [productVariations.id],
  }),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  product: one(products, { fields: [files.productId], references: [products.id] }),
  variation: one(productVariations, {
    fields: [files.variationId],
    references: [productVariations.id],
  }),
  downloads: many(downloads),
}));

// ============================================================================
// ATRIBUTOS E VARIAÇÕES (NORMALIZADO)
// ============================================================================

export const attributes = pgTable('attributes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const attributeValues = pgTable('attribute_values', {
  id: uuid('id').defaultRandom().primaryKey(),
  attributeId: uuid('attribute_id')
    .notNull()
    .references(() => attributes.id, { onDelete: 'cascade' }),
  value: varchar('value', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const productAttributes = pgTable(
  'product_attributes',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    attributeId: uuid('attribute_id')
      .notNull()
      .references(() => attributes.id, { onDelete: 'cascade' }),
  },
  table => ({
    pk: primaryKey({ columns: [table.productId, table.attributeId] }),
  })
);

export const variationAttributeValues = pgTable(
  'variation_attribute_values',
  {
    variationId: uuid('variation_id')
      .notNull()
      .references(() => productVariations.id, { onDelete: 'cascade' }),
    attributeId: uuid('attribute_id')
      .notNull()
      .references(() => attributes.id, { onDelete: 'cascade' }),
    valueId: uuid('value_id')
      .notNull()
      .references(() => attributeValues.id, { onDelete: 'cascade' }),
  },
  table => ({
    pk: primaryKey({ columns: [table.variationId, table.attributeId, table.valueId] }),
  })
);

export const attributesRelations = relations(attributes, ({ many }) => ({
  values: many(attributeValues),
  productAttributes: many(productAttributes),
}));

export const attributeValuesRelations = relations(attributeValues, ({ one }) => ({
  attribute: one(attributes, {
    fields: [attributeValues.attributeId],
    references: [attributes.id],
  }),
}));

export const productAttributesRelations = relations(productAttributes, ({ one }) => ({
  product: one(products, { fields: [productAttributes.productId], references: [products.id] }),
  attribute: one(attributes, {
    fields: [productAttributes.attributeId],
    references: [attributes.id],
  }),
}));

export const variationAttributeValuesRelations = relations(variationAttributeValues, ({ one }) => ({
  variation: one(productVariations, {
    fields: [variationAttributeValues.variationId],
    references: [productVariations.id],
  }),
  attribute: one(attributes, {
    fields: [variationAttributeValues.attributeId],
    references: [attributes.id],
  }),
  value: one(attributeValues, {
    fields: [variationAttributeValues.valueId],
    references: [attributeValues.id],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
  variation: one(productVariations, {
    fields: [productImages.variationId],
    references: [productVariations.id],
  }),
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  products: many(couponProducts),
  variations: many(couponVariations),
  redemptions: many(couponRedemptions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const categoryI18nRelations = relations(categoryI18n, ({ one }) => ({
  category: one(categories, {
    fields: [categoryI18n.categoryId],
    references: [categories.id],
  }),
}));

export const productI18nRelations = relations(productI18n, ({ one }) => ({
  product: one(products, {
    fields: [productI18n.productId],
    references: [products.id],
  }),
}));

export const productVariationI18nRelations = relations(productVariationI18n, ({ one }) => ({
  variation: one(productVariations, {
    fields: [productVariationI18n.variationId],
    references: [productVariations.id],
  }),
}));

// ============================================================================
// CONFIGURAÇÕES DO SITE
// ============================================================================

export const siteSettings = pgTable('site_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteName: varchar('site_name', { length: 255 }).notNull().default('A Rafa Criou'),
  siteDescription: text('site_description'),
  siteUrl: varchar('site_url', { length: 255 }),
  supportEmail: varchar('support_email', { length: 255 }),
  pixEnabled: boolean('pix_enabled').default(true).notNull(),
  stripeEnabled: boolean('stripe_enabled').default(true).notNull(),
  maintenanceMode: boolean('maintenance_mode').default(false).notNull(),
  allowGuestCheckout: boolean('allow_guest_checkout').default(true).notNull(),
  maxDownloadsPerProduct: integer('max_downloads_per_product').default(3).notNull(),
  downloadLinkExpiration: integer('download_link_expiration').default(24).notNull(),
  accessDays: integer('access_days').default(30).notNull(), // Dias de acesso aos produtos digitais após a compra
  enableWatermark: boolean('enable_watermark').default(false).notNull(),
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
  metaKeywords: text('meta_keywords'),
  googleAnalyticsId: varchar('google_analytics_id', { length: 100 }),
  facebookPixelId: varchar('facebook_pixel_id', { length: 100 }),

  // Configurações de Afiliados
  affiliateEnabled: boolean('affiliate_enabled').default(false).notNull(),
  affiliateDefaultCommission: decimal('affiliate_default_commission', { precision: 10, scale: 2 })
    .default('10.00')
    .notNull(),
  affiliateMinPayout: decimal('affiliate_min_payout', { precision: 10, scale: 2 })
    .default('50.00')
    .notNull(),
  affiliateCookieDays: integer('affiliate_cookie_days').default(30).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// CARRINHO E FAVORITOS (vinculado ao usuário)
// ============================================================================

export const cartItems = pgTable('cart_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  variationId: uuid('variation_id').references(() => productVariations.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(), // Preço no momento de adicionar (para histórico)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const favorites = pgTable('favorites', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations para carrinho e favoritos
export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
  variation: one(productVariations, {
    fields: [cartItems.variationId],
    references: [productVariations.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, { fields: [favorites.userId], references: [users.id] }),
  product: one(products, { fields: [favorites.productId], references: [products.id] }),
}));

// ============================================================================
// NOTIFICAÇÕES (Sistema Completo)
// ============================================================================

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // order_confirmation, download_ready, password_reset, promotional
  channel: varchar('channel', { length: 20 }).notNull(), // email, whatsapp, sms, web_push
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, sent, failed, read
  subject: varchar('subject', { length: 255 }),
  content: text('content').notNull(),
  metadata: text('metadata'), // JSON com dados extras (order_id, product_id, etc)
  sentAt: timestamp('sent_at'),
  readAt: timestamp('read_at'),
  failedReason: text('failed_reason'),
  retryCount: integer('retry_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const notificationSettings = pgTable('notification_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),

  // Preferências por tipo de notificação
  orderConfirmationEmail: boolean('order_confirmation_email').default(true).notNull(),
  orderConfirmationSms: boolean('order_confirmation_sms').default(false).notNull(),
  orderConfirmationWhatsapp: boolean('order_confirmation_whatsapp').default(false).notNull(),

  downloadReadyEmail: boolean('download_ready_email').default(true).notNull(),
  downloadReadySms: boolean('download_ready_sms').default(false).notNull(),
  downloadReadyWhatsapp: boolean('download_ready_whatsapp').default(false).notNull(),

  promotionalEmail: boolean('promotional_email').default(true).notNull(),
  promotionalSms: boolean('promotional_sms').default(false).notNull(),
  promotionalWhatsapp: boolean('promotional_whatsapp').default(false).notNull(),

  securityEmail: boolean('security_email').default(true).notNull(), // sempre ativo (reset senha)

  // DND (Do Not Disturb) - horários permitidos para notificações
  dndEnabled: boolean('dnd_enabled').default(false).notNull(),
  dndStartHour: integer('dnd_start_hour').default(22), // 22h
  dndEndHour: integer('dnd_end_hour').default(8), // 8h

  // Contatos alternativos
  whatsappNumber: varchar('whatsapp_number', { length: 20 }),
  smsNumber: varchar('sms_number', { length: 20 }),
  webPushSubscription: text('web_push_subscription'), // JSON com subscription object

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// SISTEMA DE AFILIAÇÃO
// ============================================================================

export const affiliates = pgTable('affiliates', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  code: varchar('code', { length: 50 }).notNull().unique(), // Código único do afiliado
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),

  // Comissões
  commissionType: varchar('commission_type', { length: 20 }).notNull().default('percent'), // percent, fixed
  commissionValue: decimal('commission_value', { precision: 10, scale: 2 }).notNull(),

  // Dados bancários para pagamento
  pixKey: varchar('pix_key', { length: 255 }),
  bankName: varchar('bank_name', { length: 255 }),
  bankAccount: varchar('bank_account', { length: 50 }),

  // Status e estatísticas
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive, suspended
  totalClicks: integer('total_clicks').default(0),
  totalOrders: integer('total_orders').default(0),
  totalRevenue: decimal('total_revenue', { precision: 10, scale: 2 }).default('0'),
  totalCommission: decimal('total_commission', { precision: 10, scale: 2 }).default('0'),
  pendingCommission: decimal('pending_commission', { precision: 10, scale: 2 }).default('0'),
  paidCommission: decimal('paid_commission', { precision: 10, scale: 2 }).default('0'),

  // Tipo de afiliado e termos
  affiliateType: varchar('affiliate_type', { length: 20 }).notNull().default('common'), // common, commercial_license
  termsAccepted: boolean('terms_accepted').default(false).notNull(),
  termsAcceptedAt: timestamp('terms_accepted_at'),
  termsIp: varchar('terms_ip', { length: 45 }),

  // Contrato (apenas commercial_license)
  contractSigned: boolean('contract_signed').default(false).notNull(),
  contractSignedAt: timestamp('contract_signed_at'),
  contractSignatureData: text('contract_signature_data'), // Canvas signature data
  contractDocumentUrl: text('contract_document_url'), // PDF URL

  // Verificação PIX (apenas common)
  pixVerificationStatus: varchar('pix_verification_status', { length: 20 }).default('pending'), // pending, verified, failed

  // Aprovação e materiais
  autoApproved: boolean('auto_approved').default(false).notNull(),
  materialsSent: boolean('materials_sent').default(false).notNull(),
  materialsSentAt: timestamp('materials_sent_at'),
  lastAccessAt: timestamp('last_access_at'),
  notes: text('notes'),

  approvedBy: text('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const affiliateLinks = pgTable('affiliate_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  affiliateId: uuid('affiliate_id')
    .notNull()
    .references(() => affiliates.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }), // null = link geral
  url: text('url').notNull(), // URL completa com código do afiliado
  shortCode: varchar('short_code', { length: 20 }).notNull().unique(), // Código curto para o link
  clicks: integer('clicks').default(0),
  conversions: integer('conversions').default(0),
  revenue: decimal('revenue', { precision: 10, scale: 2 }).default('0'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const affiliateCommissions = pgTable('affiliate_commissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  affiliateId: uuid('affiliate_id')
    .notNull()
    .references(() => affiliates.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  linkId: uuid('link_id').references(() => affiliateLinks.id),

  // Valores
  orderTotal: decimal('order_total', { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal('commission_rate', { precision: 10, scale: 2 }).notNull(), // Taxa no momento da compra
  commissionAmount: decimal('commission_amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),

  // Status do pagamento
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, paid, cancelled
  approvedBy: text('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  paidAt: timestamp('paid_at'),
  paymentMethod: varchar('payment_method', { length: 50 }), // pix, bank_transfer
  paymentProof: text('payment_proof'), // URL do comprovante
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela de cliques de afiliados (para detecção de fraude e analytics)
export const affiliateClicks = pgTable('affiliate_clicks', {
  id: uuid('id').defaultRandom().primaryKey(),
  affiliateId: uuid('affiliate_id')
    .notNull()
    .references(() => affiliates.id, { onDelete: 'cascade' }),
  linkId: uuid('link_id').references(() => affiliateLinks.id),

  // Dados de rastreamento
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),
  referer: text('referer'),
  country: varchar('country', { length: 2 }),
  deviceType: varchar('device_type', { length: 20 }), // desktop, mobile, tablet

  // Conversão
  converted: boolean('converted').default(false).notNull(),
  orderId: uuid('order_id').references(() => orders.id),

  clickedAt: timestamp('clicked_at').defaultNow().notNull(),
});

// Materiais para afiliados (PDFs, ZIPs, imagens)
export const affiliateMaterials = pgTable('affiliate_materials', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  fileUrl: text('file_url').notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 100 }),
  fileSize: integer('file_size'),
  affiliateType: varchar('affiliate_type', { length: 20 }).notNull(), // common, commercial_license, both
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: text('created_by').references(() => users.id),
});

// Rastreamento de downloads de materiais
export const affiliateMaterialDownloads = pgTable('affiliate_material_downloads', {
  id: uuid('id').defaultRandom().primaryKey(),
  affiliateId: uuid('affiliate_id')
    .notNull()
    .references(() => affiliates.id, { onDelete: 'cascade' }),
  materialId: uuid('material_id')
    .notNull()
    .references(() => affiliateMaterials.id, { onDelete: 'cascade' }),
  downloadedAt: timestamp('downloaded_at').defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
});

// Acesso temporário a arquivos para afiliados commercial_license
export const affiliateFileAccess = pgTable('affiliate_file_access', {
  id: uuid('id').defaultRandom().primaryKey(),
  affiliateId: uuid('affiliate_id')
    .notNull()
    .references(() => affiliates.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  fileUrl: text('file_url').notNull(),
  grantedAt: timestamp('granted_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  printCount: integer('print_count').default(0).notNull(),
  lastAccessedAt: timestamp('last_accessed_at'),
  buyerName: varchar('buyer_name', { length: 255 }),
  buyerEmail: varchar('buyer_email', { length: 255 }),
  buyerPhone: varchar('buyer_phone', { length: 50 }),
  isActive: boolean('is_active').default(true).notNull(),
  notes: text('notes'),
});

// ============================================================================
// REVIEWS E AVALIAÇÕES
// ============================================================================

export const productReviews = pgTable('product_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  variationId: uuid('variation_id').references(() => productVariations.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id), // Validação: apenas quem comprou pode avaliar

  // Avaliação
  rating: integer('rating').notNull(), // 1-5 estrelas
  title: varchar('title', { length: 255 }),
  comment: text('comment'),

  // Moderação
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected
  moderatedBy: text('moderated_by').references(() => users.id),
  moderatedAt: timestamp('moderated_at'),
  rejectionReason: text('rejection_reason'),

  // Engajamento
  helpfulCount: integer('helpful_count').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const reviewHelpful = pgTable(
  'review_helpful',
  {
    reviewId: uuid('review_id')
      .notNull()
      .references(() => productReviews.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.reviewId, table.userId] }),
  })
);

// ============================================================================
// PRODUTOS RELACIONADOS
// ============================================================================

export const relatedProducts = pgTable(
  'related_products',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    relatedProductId: uuid('related_product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.productId, table.relatedProductId] }),
  })
);

// ============================================================================
// NOVAS RELAÇÕES (Notificações, Afiliados, Reviews, Produtos Relacionados)
// ============================================================================

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const notificationSettingsRelations = relations(notificationSettings, ({ one }) => ({
  user: one(users, { fields: [notificationSettings.userId], references: [users.id] }),
}));

export const affiliatesRelations = relations(affiliates, ({ one, many }) => ({
  user: one(users, { fields: [affiliates.userId], references: [users.id] }),
  approver: one(users, { fields: [affiliates.approvedBy], references: [users.id] }),
  links: many(affiliateLinks),
  commissions: many(affiliateCommissions),
  clicks: many(affiliateClicks),
  orders: many(orders),
  materialDownloads: many(affiliateMaterialDownloads),
  fileAccess: many(affiliateFileAccess),
}));

export const affiliateLinksRelations = relations(affiliateLinks, ({ one, many }) => ({
  affiliate: one(affiliates, { fields: [affiliateLinks.affiliateId], references: [affiliates.id] }),
  product: one(products, { fields: [affiliateLinks.productId], references: [products.id] }),
  clicks: many(affiliateClicks),
  orders: many(orders),
}));

export const affiliateClicksRelations = relations(affiliateClicks, ({ one }) => ({
  affiliate: one(affiliates, {
    fields: [affiliateClicks.affiliateId],
    references: [affiliates.id],
  }),
  link: one(affiliateLinks, { fields: [affiliateClicks.linkId], references: [affiliateLinks.id] }),
  order: one(orders, { fields: [affiliateClicks.orderId], references: [orders.id] }),
}));

export const affiliateCommissionsRelations = relations(affiliateCommissions, ({ one }) => ({
  affiliate: one(affiliates, {
    fields: [affiliateCommissions.affiliateId],
    references: [affiliates.id],
  }),
  order: one(orders, { fields: [affiliateCommissions.orderId], references: [orders.id] }),
  link: one(affiliateLinks, {
    fields: [affiliateCommissions.linkId],
    references: [affiliateLinks.id],
  }),
  approver: one(users, { fields: [affiliateCommissions.approvedBy], references: [users.id] }),
}));

export const affiliateMaterialsRelations = relations(affiliateMaterials, ({ one, many }) => ({
  creator: one(users, { fields: [affiliateMaterials.createdBy], references: [users.id] }),
  downloads: many(affiliateMaterialDownloads),
}));

export const affiliateMaterialDownloadsRelations = relations(
  affiliateMaterialDownloads,
  ({ one }) => ({
    affiliate: one(affiliates, {
      fields: [affiliateMaterialDownloads.affiliateId],
      references: [affiliates.id],
    }),
    material: one(affiliateMaterials, {
      fields: [affiliateMaterialDownloads.materialId],
      references: [affiliateMaterials.id],
    }),
  })
);

export const affiliateFileAccessRelations = relations(affiliateFileAccess, ({ one }) => ({
  affiliate: one(affiliates, {
    fields: [affiliateFileAccess.affiliateId],
    references: [affiliates.id],
  }),
  order: one(orders, {
    fields: [affiliateFileAccess.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [affiliateFileAccess.productId],
    references: [products.id],
  }),
}));

export const productReviewsRelations = relations(productReviews, ({ one, many }) => ({
  product: one(products, { fields: [productReviews.productId], references: [products.id] }),
  variation: one(productVariations, {
    fields: [productReviews.variationId],
    references: [productVariations.id],
  }),
  user: one(users, { fields: [productReviews.userId], references: [users.id] }),
  order: one(orders, { fields: [productReviews.orderId], references: [orders.id] }),
  moderator: one(users, { fields: [productReviews.moderatedBy], references: [users.id] }),
  helpful: many(reviewHelpful),
}));

export const reviewHelpfulRelations = relations(reviewHelpful, ({ one }) => ({
  review: one(productReviews, {
    fields: [reviewHelpful.reviewId],
    references: [productReviews.id],
  }),
  user: one(users, { fields: [reviewHelpful.userId], references: [users.id] }),
}));

export const relatedProductsRelations = relations(relatedProducts, ({ one }) => ({
  product: one(products, {
    fields: [relatedProducts.productId],
    references: [products.id],
    relationName: 'productRelated',
  }),
  relatedProduct: one(products, {
    fields: [relatedProducts.relatedProductId],
    references: [products.id],
    relationName: 'relatedByProduct',
  }),
}));

export const promotionsRelations = relations(promotions, ({ many }) => ({
  promotionProducts: many(promotionProducts),
  promotionVariations: many(promotionVariations),
}));

export const promotionProductsRelations = relations(promotionProducts, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionProducts.promotionId],
    references: [promotions.id],
  }),
  product: one(products, {
    fields: [promotionProducts.productId],
    references: [products.id],
  }),
}));

export const promotionVariationsRelations = relations(promotionVariations, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionVariations.promotionId],
    references: [promotions.id],
  }),
  variation: one(productVariations, {
    fields: [promotionVariations.variationId],
    references: [productVariations.id],
  }),
}));

// ============================================================================
// UPLOAD TEMPORÁRIO (Chunks)
// ============================================================================

export const uploadChunks = pgTable(
  'upload_chunks',
  {
    uploadId: text('upload_id').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    chunkData: text('chunk_data').notNull(), // PostgreSQL converte Buffer<->bytea automaticamente
    fileName: varchar('file_name', { length: 500 }).notNull(),
    fileType: varchar('file_type', { length: 100 }).notNull(),
    totalChunks: integer('total_chunks').notNull(),
    fileSize: integer('file_size').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.uploadId, table.chunkIndex] }),
  })
); // ============================================================================
// BACKGROUND JOBS (fila simples no banco)
// ============================================================================

export const productJobs = pgTable('product_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: varchar('type', { length: 100 }).notNull(), // ex: 'translate_product'
  payload: text('payload').notNull(), // JSON string with necessary data
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, processing, done, failed
  attempts: integer('attempts').default(0),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// SISTEMA FINANCEIRO
// ============================================================================

// Categorias financeiras (para despesas e receitas)
export const financialCategories = pgTable('financial_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // INCOME, EXPENSE
  scope: varchar('scope', { length: 20 }).notNull(), // STORE, PERSONAL, BOTH
  color: varchar('color', { length: 20 }), // Cor para UI
  icon: varchar('icon', { length: 50 }), // Ícone para UI
  displayOrder: integer('display_order').default(0),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Transações financeiras (receitas e despesas)
export const financialTransactions = pgTable('financial_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: timestamp('date').notNull(), // Data do lançamento/pagamento
  type: varchar('type', { length: 20 }).notNull(), // INCOME, EXPENSE
  scope: varchar('scope', { length: 20 }).notNull(), // STORE, PERSONAL
  recurrence: varchar('recurrence', { length: 20 }), // ONE_OFF, MONTHLY, QUARTERLY, SEMIANNUAL, ANNUAL
  expenseKind: varchar('expense_kind', { length: 20 }), // FIXED, VARIABLE, DAILY (para despesas)
  categoryId: uuid('category_id').references(() => financialCategories.id),
  description: text('description').notNull(), // Ex: "Hospedagem", "Mercado", etc
  paymentMethod: varchar('payment_method', { length: 50 }), // PIX, CARD, BOLETO, CASH, etc
  installmentsTotal: integer('installments_total'), // Total de parcelas
  installmentNumber: integer('installment_number'), // Número da parcela atual
  amountTotal: decimal('amount_total', { precision: 12, scale: 2 }), // Valor total (quando parcelado)
  amountMonthly: decimal('amount_monthly', { precision: 12, scale: 2 }), // Valor mensal/parcela
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(), // Valor efetivo deste lançamento
  paid: boolean('paid').default(false).notNull(),
  paidAt: timestamp('paid_at'),
  canceledAt: timestamp('canceled_at'), // Data de cancelamento de recorrência
  // Referências opcionais
  orderId: uuid('order_id').references(() => orders.id), // Link para vendas
  affiliateCommissionId: uuid('affiliate_commission_id').references(() => affiliateCommissions.id), // Link para comissões
  notes: text('notes'), // Observações adicionais
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Saldo mensal (saldo inicial de cada mês)
export const monthlyBalances = pgTable('monthly_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  month: varchar('month', { length: 7 }).notNull().unique(), // YYYY-MM
  openingBalance: decimal('opening_balance', { precision: 12, scale: 2 }).notNull().default('0'),
  closingBalanceLocked: decimal('closing_balance_locked', { precision: 12, scale: 2 }), // Opcional: saldo final "fechado"
  locked: boolean('locked').default(false).notNull(), // Se o mês foi "fechado"
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Fundos (contas anuais e investimentos)
export const funds = pgTable('funds', {
  id: uuid('id').defaultRandom().primaryKey(),
  fundType: varchar('fund_type', { length: 20 }).notNull(), // ANNUAL_BILL, INVESTMENT
  categoryId: uuid('category_id').references(() => financialCategories.id),
  title: varchar('title', { length: 200 }).notNull(), // Ex: "IPTU", "Reserva investimento"
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'), // Data final ou vencimento
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  monthlyAmount: decimal('monthly_amount', { precision: 12, scale: 2 }).notNull(),
  active: boolean('active').default(true).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Contribuições mensais para fundos
export const fundContributions = pgTable('fund_contributions', {
  id: uuid('id').defaultRandom().primaryKey(),
  fundId: uuid('fund_id')
    .notNull()
    .references(() => funds.id, { onDelete: 'cascade' }),
  month: varchar('month', { length: 7 }).notNull(), // YYYY-MM
  expectedAmount: decimal('expected_amount', { precision: 12, scale: 2 }).notNull(),
  saved: boolean('saved').default(false).notNull(),
  savedAmount: decimal('saved_amount', { precision: 12, scale: 2 }).default('0'),
  savedAt: timestamp('saved_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const financialCategoriesRelations = relations(financialCategories, ({ many }) => ({
  transactions: many(financialTransactions),
  funds: many(funds),
}));

export const financialTransactionsRelations = relations(financialTransactions, ({ one }) => ({
  category: one(financialCategories, {
    fields: [financialTransactions.categoryId],
    references: [financialCategories.id],
  }),
  order: one(orders, {
    fields: [financialTransactions.orderId],
    references: [orders.id],
  }),
  affiliateCommission: one(affiliateCommissions, {
    fields: [financialTransactions.affiliateCommissionId],
    references: [affiliateCommissions.id],
  }),
}));

export const fundsRelations = relations(funds, ({ one, many }) => ({
  category: one(financialCategories, {
    fields: [funds.categoryId],
    references: [financialCategories.id],
  }),
  contributions: many(fundContributions),
}));

export const fundContributionsRelations = relations(fundContributions, ({ one }) => ({
  fund: one(funds, {
    fields: [fundContributions.fundId],
    references: [funds.id],
  }),
}));
