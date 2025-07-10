# InPost Admin Dashboard Setup Guide

## ✅ **Critical Fix Applied**

The InPost method detection has been fixed. The issue was that the frontend was looking for specific names like "inpost locker" but your admin created a method named just "Inpost". Now it detects any method containing "inpost" in the name or provider ID.

## 🎯 **Complete Admin Dashboard Setup**

Follow these steps **exactly** in your Medusa admin dashboard to properly configure InPost shipping:

### **Step 1: Access Admin Dashboard**

1. Go to: `https://backend-production-7647.up.railway.app/app`
2. Log in with your admin credentials

### **Step 2: Delete Existing InPost Shipping Options**

**⚠️ IMPORTANT:** Delete any existing InPost options that aren't working

1. **Settings** → **Shipping** → **Shipping Options**
2. Find any existing InPost options
3. Click **Delete** on each one
4. Confirm deletion

### **Step 3: Verify Fulfillment Provider**

1. **Settings** → **Regions**
2. Click on your **Europe** region
3. Go to **Fulfillment Providers** tab
4. You should see:
   - ✅ **Manual Fulfillment**
   - ✅ **InPost** (if environment variables are set)

If InPost is missing, check your Railway environment variables!

### **Step 4: Create InPost Locker Shipping Option**

1. **Settings** → **Shipping** → **Shipping Options**
2. Click **"+ Add Option"**
3. Configure exactly as follows:

**Basic Information:**

- **Name**: `InPost Locker`
- **Provider**: Select **InPost**
- **Price Type**: **Flat Rate**
- **Amount**: `999` (this is 9.99 EUR in cents)

**Shipping Option Details:**

- **Is Return**: ❌ Unchecked
- **Admin Only**: ❌ Unchecked

**Regions:**

- ✅ Check **Europe** (or your target region)

**Shipping Profiles:**

- ✅ Check **Default Shipping Profile**

**Requirements:**

- Leave empty (no requirements)

4. Click **Save**

### **Step 5: Create InPost Courier Shipping Option**

1. Click **"+ Add Option"** again
2. Configure exactly as follows:

**Basic Information:**

- **Name**: `InPost Courier`
- **Provider**: Select **InPost**
- **Price Type**: **Flat Rate**
- **Amount**: `1999` (this is 19.99 EUR in cents)

**Shipping Option Details:**

- **Is Return**: ❌ Unchecked
- **Admin Only**: ❌ Unchecked

**Regions:**

- ✅ Check **Europe** (or your target region)

**Shipping Profiles:**

- ✅ Check **Default Shipping Profile**

**Requirements:**

- Leave empty (no requirements)

3. Click **Save**

### **Step 6: Verify Shipping Options**

After creating both options, you should see:

- ✅ **InPost Locker** - €9.99 - InPost Provider
- ✅ **InPost Courier** - €19.99 - InPost Provider

### **Step 7: Test in Storefront**

1. Go to your storefront: `https://storefront-production-0c0b.up.railway.app`
2. Add a product to cart
3. Go to checkout
4. In the shipping step, you should see:
   - Standard Shipping
   - Express Shipping
   - **InPost Locker** ← Should now work!
   - **InPost Courier**

**✅ NEW IMPROVED - InPost Locker Workflow:**

**Perfect User Flow (Fixed!):**

1. **Click "InPost Locker"** → Locker selector appears immediately! 🎉
2. **Search for lockers** by city/postal code or GPS
3. **Choose a locker** from the list
4. **Click "Confirm InPost Locker Selection"** → Method is applied
5. **Continue to payment** → Works perfectly!

**Key Features:**

- ✅ Locker selector shows instantly when you click InPost
- ✅ No more server errors
- ✅ Clear confirmation step
- ✅ Smooth checkout experience

## 🔧 **Troubleshooting Admin Issues**

### **Issue: InPost Provider Not Available**

**Solution:**

1. Check Railway environment variables are set:
   - `INPOST_API_KEY`
   - `INPOST_ORGANIZATION_ID`
   - `INPOST_ENVIRONMENT`
2. Redeploy backend
3. Wait 2-3 minutes for deployment

### **Issue: Shipping Options Not Showing in Checkout**

**Check:**

1. ✅ Correct region selected (Europe)
2. ✅ Correct shipping profile selected
3. ✅ "Is Return" is unchecked
4. ✅ "Admin Only" is unchecked
5. ✅ Price is set in cents (999 = €9.99)

### **Issue: Still Getting Server Errors**

**Check Backend Logs:**

1. Railway Dashboard → Backend Service → Logs
2. Look for InPost-related errors during checkout
3. Check fulfillment provider initialization logs

## 📋 **Final Verification Checklist**

After setup, verify these work:

### **Admin Dashboard:**

- [ ] InPost appears in Fulfillment Providers
- [ ] Two InPost shipping options created
- [ ] Options show correct prices
- [ ] Options are enabled and visible

### **Storefront:**

- [ ] InPost options appear in checkout
- [ ] Selecting InPost shows locker selector
- [ ] Can search for lockers
- [ ] Can select a locker
- [ ] Can complete checkout without errors

### **Backend:**

- [ ] No errors in Railway logs
- [ ] InPost API credentials working
- [ ] Fulfillment provider initialized correctly

## 💡 **Pro Tips**

1. **Names Matter**: Use clear names like "InPost Locker" and "InPost Courier"
2. **Price in Cents**: Always enter prices in cents (999 = €9.99)
3. **Provider Selection**: Make sure you select "InPost" as the provider
4. **Region Assignment**: Always assign to the correct region
5. **Testing**: Test immediately after creating each option

## 🚀 **Expected Result**

After following this guide:

- ✅ InPost options appear in checkout
- ✅ Locker selector works for InPost Locker
- ✅ Orders can be completed successfully
- ✅ No server errors in console or logs

If you still have issues after following this guide exactly, check the Railway backend logs for specific error messages and provide them for further debugging.
