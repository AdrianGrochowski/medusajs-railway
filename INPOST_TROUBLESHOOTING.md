# InPost Integration - Troubleshooting & Monitoring Guide

## ✅ **Comprehensive Logging System Deployed**

The InPost integration now includes extensive logging throughout the entire flow. Every operation has unique request IDs to help track issues.

## 🔍 **How to Monitor InPost Integration**

### 1. **Browser Console (Frontend)**

Open browser Developer Tools → Console tab to see:

```
[InPost-Frontend-abc123] Fetching lockers with params: {...}
[InPost-Location-def456] Requesting user location
[Shipping-ghi789] Setting shipping method: {...}
[Cart-jkl012] Error adding shipping method: {...}
```

### 2. **Railway Backend Logs**

In Railway Dashboard → Backend Service → Logs:

```
[InPost-mno345] Fetching lockers request started
[InPost-mno345] InPost API response status: 200
[InPost-mno345] Successfully transformed 15 lockers
```

### 3. **Request ID Tracking**

Every operation gets a unique request ID (e.g., `abc123`) to trace the entire flow from frontend to backend.

## 🧪 **Testing the InPost Integration**

### **Test 1: Basic Locker Search**

1. Go to checkout → shipping step
2. Select an InPost shipping method
3. Open browser console and look for:
   ```
   [InPost-Frontend-*] Fetching lockers with params
   [InPost-Frontend-*] Successfully received X lockers
   ```

### **Test 2: GPS Location Search**

1. Click "Use My Location" button
2. Check console for:
   ```
   [InPost-Location-*] Requesting user location
   [InPost-Location-*] Location obtained: {lat: ..., lng: ...}
   ```

### **Test 3: Locker Selection & Checkout**

1. Select a locker from the list
2. Click "Continue to Payment"
3. Monitor for:
   ```
   [Shipping-*] Using InPost locker data: {locker_id: "..."}
   [Cart-*] Error adding shipping method (if any)
   ```

## 🚨 **Common Issues & Solutions**

### **Issue 1: "InPost API not configured"**

**Symptoms:**

- Console shows: `[InPost-*] InPost API key not configured`
- Response: `{"error": "InPost API not configured"}`

**Solution:**

- Check Railway environment variables:
  - `INPOST_API_KEY`
  - `INPOST_ORGANIZATION_ID`
  - `INPOST_ENVIRONMENT`
- Redeploy backend after adding variables

### **Issue 2: "No lockers found"**

**Symptoms:**

- Console shows: `[InPost-*] Successfully received 0 lockers`
- UI message: "No InPost lockers found in your area"

**Solution:**

- Check search parameters (city, postal code, country)
- Try different locations (Warsaw, Krakow for Poland)
- Verify InPost API response in backend logs

### **Issue 3: "Server Components render error"**

**Symptoms:**

- 500 error when selecting InPost shipping
- Digest error in response

**Solution:**

- Check backend logs for InPost fulfillment provider errors
- Verify locker data is being passed correctly
- Check if price calculation is working

### **Issue 4: "Unable to get location"**

**Symptoms:**

- GPS search fails
- Console shows: `[InPost-Location-*] Location error`

**Solution:**

- User must allow location permissions
- Use manual city/postal code search instead
- HTTPS required for geolocation

## 📊 **Monitoring Checklist**

### **Backend Health:**

- [ ] InPost API credentials configured in Railway
- [ ] Backend deployment successful
- [ ] No errors in Railway logs during startup
- [ ] `/store/inpost/lockers` endpoint responding

### **Frontend Integration:**

- [ ] Locker selector component renders
- [ ] Search functions work (manual + GPS)
- [ ] Locker selection updates UI
- [ ] Shipping method validation passes

### **Complete Flow:**

- [ ] Can search for lockers
- [ ] Can select a locker
- [ ] Can proceed through checkout
- [ ] Order completes successfully

## 🔧 **Advanced Debugging**

### **API Testing**

Test InPost API directly:

```bash
# Test backend endpoint
curl "https://backend-production-7647.up.railway.app/store/inpost/lockers?city=Warsaw&country_code=PL"

# Check specific request ID in logs
grep "InPost-abc123" railway_logs.txt
```

### **Data Validation**

Check if locker data is properly formatted:

```javascript
// In browser console after locker search
console.log(window.lastInPostResponse);
```

### **Backend Fulfillment Logs**

Look for these in Railway logs:

```
[InPost] Validating fulfillment data for option: inpost-locker
[InPost] Calculating price for InPost option: inpost-locker
[InPost] Calculated InPost Locker price: 999 cents
```

## 📞 **When to Escalate**

Contact support if you see:

1. **Consistent API failures** - InPost service might be down
2. **Authentication errors** - API key might be expired
3. **Data format errors** - InPost API format might have changed
4. **Payment/order failures** - Integration with Medusa core issue

## 🎯 **Success Indicators**

✅ **Everything Working:**

- Console shows successful API calls with request IDs
- Lockers load and display correctly
- Shipping method selection works
- Orders complete without errors
- No error messages in UI or logs

The comprehensive logging system ensures you can trace any issue from the user action all the way through to the backend API calls and responses.
