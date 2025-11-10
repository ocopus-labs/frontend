# 🚀 Quick Start Guide - For Developers

**Get up and running in 15 minutes**

---

## 👋 Welcome!

This guide will help you:
1. Understand the project structure
2. Set up your development environment
3. Run the application locally
4. Make your first feature contribution

**Time to complete**: 15 minutes

---

## 📚 Step 1: Read the Docs (5 minutes)

### Essential Reading Order

1. **START HERE**: [UNIFIED_POS_SYSTEM_OVERVIEW.md](./UNIFIED_POS_SYSTEM_OVERVIEW.md)
   - Read the Vision & Mission section
   - Skim the Architecture Overview
   - Understand the Core Features

2. **For Payment Work**: [PAYMENT_GATEWAY_ARCHITECTURE.md](./payments/PAYMENT_GATEWAY_ARCHITECTURE.md)
   - Focus on "Business Context & Student Startup Strategy"
   - Understand the Adapter Pattern
   - Note the provider comparison table

3. **For Frontend Work**: [FRONTEND_IMPLEMENTATION_GUIDE.md](./FRONTEND_IMPLEMENTATION_GUIDE.md)
   - Review SvelteKit 5 features
   - Check the component examples
   - Understand state management

### Quick Context

**What are we building?**
A unified billing and POS system that works for restaurants, retail, salons, and bars from a single codebase.

**Tech Stack**:
- **Frontend**: SvelteKit 5 + Tailwind CSS 4 + shadcn-svelte
- **Backend**: NestJS (planned) + PostgreSQL
- **Payments**: Dodo Payments (MVP - lowest fees) / Stripe (Global) / Pine Labs (Enterprise)

**Current Status**: MVP phase with working POS UI

---

## 💻 Step 2: Environment Setup (3 minutes)

### Prerequisites Check

```bash
# Check Node.js version (need >= 20.0.0)
node --version

# Check npm version (need >= 10.0.0)
npm --version

# If outdated, install from https://nodejs.org/
```

### Clone & Install

```bash
# Clone the repository
git clone <your-repo-url>
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your values (see below)
```

### Environment Variables

Create `.env` file:

```bash
# API Configuration (use mock API for now)
PUBLIC_API_URL=http://localhost:3000/api
PUBLIC_WS_URL=ws://localhost:3000

# Payment Gateway - Test Mode (FREE)
# Get free test keys from https://dodopayments.com/
PUBLIC_DODO_PAYMENTS_KEY=dodo_test_xxxxx

# Feature Flags
PUBLIC_ENABLE_OFFLINE_MODE=true
PUBLIC_ENABLE_ANALYTICS=false
```

**Getting Dodo Payments Test Keys** (Optional for MVP):
1. Go to https://dodopayments.com/
2. Sign up (no business registration needed for test mode)
3. Dashboard → Settings → API Keys → Generate Test Key
4. Copy `Key ID` to `PUBLIC_DODO_PAYMENTS_KEY`

---

## 🏃 Step 3: Run the App (2 minutes)

### Start Development Server

```bash
# Start the dev server
npm run dev

# Open in browser (auto-opens)
# If not, go to: http://localhost:5173
```

You should see:
- Landing page at `/`
- Login at `/login`
- POS demo at `/demo-business/pos`

### Verify It Works

1. Navigate to http://localhost:5173
2. Click "Demo POS" or go to `/demo-business/pos`
3. You should see:
   - Menu categories on top
   - Item cards in a grid
   - Order summary on the right
4. Click an item to add to cart
5. Verify it appears in order summary

✅ If you see items and can add to cart, you're good!

---

## 🧭 Step 4: Understand the Code Structure (5 minutes)

### Key Directories

```
frontend/
├── src/
│   ├── routes/              # SvelteKit pages (file-based routing)
│   │   ├── (auth)/         # Login, register
│   │   ├── (protected)/    # Dashboard, POS, menu
│   │   └── (public)/       # Landing page
│   │
│   ├── lib/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── pos/       # POS-specific components
│   │   │   ├── ui/        # shadcn-svelte components
│   │   │   └── global/    # Shared components
│   │   │
│   │   ├── stores/        # State management (Svelte stores)
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Helper functions
│   │   └── data/          # Mock data (for now)
│   │
│   └── app.css            # Global styles
│
├── docs/                   # THIS IS IMPORTANT - READ THESE!
├── static/                 # Static assets
└── tests/                  # E2E tests
```

### Important Files to Know

| File | Purpose | When to Edit |
|------|---------|--------------|
| `src/routes/(protected)/[business]/pos/+page.svelte` | Main POS screen | Adding POS features |
| `src/lib/stores/cart.svelte.ts` | Cart state management | Changing cart logic |
| `src/lib/components/pos/MenuItemCard.svelte` | Menu item display | Changing item card UI |
| `src/lib/types/menu.ts` | Menu type definitions | Adding menu fields |
| `src/lib/data/sample-menu.ts` | Mock menu data | Testing with different data |

---

## 🎯 Your First Contribution

### Beginner Tasks (Pick One)

#### Task 1: Add a New Dietary Badge

**Goal**: Show "Spicy" badge for items with spice level

**Files to Edit**: `src/lib/components/pos/MenuItemCard.svelte`

**Steps**:
1. Open `MenuItemCard.svelte`
2. Find the badges section (around line 40)
3. Add this code:

```svelte
{#if item.preparationTime && item.preparationTime > 20}
  <Badge variant="outline">🌶️ Spicy</Badge>
{/if}
```

4. Save and check the POS page - items with prep time > 20 should show badge

#### Task 2: Add Item Count to Cart Button

**Goal**: Show number of items in cart

**Files to Edit**: `src/routes/(protected)/[business]/pos/+page.svelte`

**Steps**:
1. Open the POS page
2. Find the "Clear All" button
3. Add a counter next to it:

```svelte
<div class="flex items-center gap-2">
  <Badge>{cart.itemCount} items</Badge>
  <Button variant="ghost" size="sm" onclick={onClear}>
    Clear All
  </Button>
</div>
```

#### Task 3: Add Search Highlight

**Goal**: Highlight search terms in item names

**Files to Edit**: `src/lib/components/pos/MenuItemCard.svelte`

**Steps**:
1. Accept a `searchQuery` prop
2. Highlight matching text in the item name
3. (This is more advanced - check the frontend guide for hints)

---

## 🐛 Common Issues & Solutions

### Issue: Port 5173 already in use

```bash
# Kill the process using the port
npx kill-port 5173

# Or use a different port
npm run dev -- --port 3000
```

### Issue: Module not found errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: TypeScript errors

```bash
# Run type checking
npm run check

# Many errors? Check you're using Node 20+
node --version
```

### Issue: Styles not loading

```bash
# Restart dev server
# Press Ctrl+C
npm run dev
```

---

## 📖 Next Steps

### Learn the Codebase

1. **Explore the POS flow**:
   - Start at `src/routes/(protected)/[business]/pos/+page.svelte`
   - Trace how clicking an item adds it to cart
   - Follow the checkout flow

2. **Study the state management**:
   - Open `src/lib/stores/cart.svelte.ts`
   - Understand Svelte 5 runes (`$state`, `$derived`)
   - See how components access the cart

3. **Check the component library**:
   - Browse `src/lib/components/ui/`
   - See how shadcn-svelte components work
   - Try using a new component

### Pick Your Focus Area

Based on your interest, read the relevant doc:

| Interest | Documentation | What You'll Build |
|----------|---------------|-------------------|
| **Payments** | PAYMENT_GATEWAY_ARCHITECTURE.md | Dodo Payments/Stripe integration |
| **UI/UX** | FRONTEND_IMPLEMENTATION_GUIDE.md | New components, layouts |
| **Business Logic** | ONBOARDING_BUSINESS_FLOW.md | Onboarding flow, menus |
| **Full-Stack** | UNIFIED_POS_SYSTEM_OVERVIEW.md | End-to-end features |

---

## 🤝 Contributing Guidelines

### Before You Code

1. **Check existing docs** - Your feature might already be designed
2. **Create an issue** - Discuss the feature/bug
3. **Get assigned** - Make sure no one else is working on it

### While You Code

1. **Follow TypeScript** - All files should be `.ts` or `.svelte` (with TypeScript)
2. **Use existing components** - Don't reinvent shadcn-svelte components
3. **Test your changes** - Run `npm run check` before committing
4. **Write tests** - Add E2E tests for critical flows

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, commit often
git add .
git commit -m "feat: add item count badge to cart"

# Push and create PR
git push origin feature/your-feature-name
```

### Commit Message Format

```
feat: add new feature
fix: fix a bug
docs: update documentation
style: formatting changes
refactor: code restructuring
test: add tests
chore: maintenance tasks
```

---

## 🆘 Getting Help

### Documentation

- **General questions**: Read [UNIFIED_POS_SYSTEM_OVERVIEW.md](./UNIFIED_POS_SYSTEM_OVERVIEW.md)
- **Payment questions**: Read `docs/payments/PAYMENT_GATEWAY_ARCHITECTURE.md`
- **Frontend questions**: Read [FRONTEND_IMPLEMENTATION_GUIDE.md](./FRONTEND_IMPLEMENTATION_GUIDE.md)
- **Onboarding questions**: Read [ONBOARDING_BUSINESS_FLOW.md](./ONBOARDING_BUSINESS_FLOW.md)

### Community

- **Discord**: [Join our Discord](#) (create a server)
- **GitHub Issues**: Create an issue with the "question" label
- **Email**: dev@yourproject.com

### External Resources

- [SvelteKit Docs](https://kit.svelte.dev/)
- [Svelte 5 Runes Guide](https://svelte-5-preview.vercel.app/docs/runes)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [shadcn-svelte Components](https://www.shadcn-svelte.com/)

---

## ✅ Checklist: Are You Ready?

Before starting development, make sure:

- [ ] I've read UNIFIED_POS_SYSTEM_OVERVIEW.md
- [ ] I can run `npm run dev` successfully
- [ ] I can see the POS interface at `/demo-business/pos`
- [ ] I can add items to cart
- [ ] I understand the file structure
- [ ] I know which documentation to reference for my work
- [ ] I've set up my environment variables

✅ All checked? **You're ready to build!**

---

## 🎓 For Student Developers

### The Lean Learning Path

**Week 1**: Get familiar
- Set up the project
- Understand the POS flow
- Make small UI changes

**Week 2**: Build features
- Add a new component
- Implement a simple feature
- Write tests

**Week 3**: Deep dive
- Understand state management
- Learn payment integration
- Contribute to docs

**Week 4**: Own a module
- Take ownership of a feature (Menu, Orders, Reports)
- Implement end-to-end
- Review others' code

### Building Your Portfolio

This project is perfect for showcasing:
- **Modern Stack**: SvelteKit 5, TypeScript, Tailwind
- **Real-World**: Actual business problem (POS systems)
- **Full-Stack**: Frontend + Backend integration
- **Best Practices**: Testing, documentation, architecture

**Resume Bullets**:
- "Built a multi-tenant POS system serving restaurants and retail stores using SvelteKit 5"
- "Integrated payment gateways (Stripe, Razorpay) using the Adapter Pattern"
- "Implemented real-time order management with WebSocket and Svelte stores"

---

## 🏆 Success Metrics

Track your progress:

### Code Contributions
- [ ] 1 merged PR
- [ ] 5 merged PRs
- [ ] 10 merged PRs
- [ ] 1 feature owned end-to-end

### Knowledge
- [ ] Can explain the Adapter Pattern
- [ ] Can build a Svelte component from scratch
- [ ] Understand SvelteKit routing
- [ ] Can integrate an API

### Community
- [ ] Helped another developer
- [ ] Reviewed someone's PR
- [ ] Wrote documentation
- [ ] Fixed a bug reported by user

---

**Welcome to the team! Let's build something amazing together.** 🚀

---

**Questions?** Open an issue with the "question" label or ping on Discord.

**Last Updated**: November 10, 2025
