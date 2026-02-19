# API Versioning Strategy

## Current Implementation

### Version: v1 (Current)

All API endpoints are currently at version 1. The API version is indicated in the response header:

```
X-API-Version: v1
```

### Endpoints

All endpoints are currently accessible at `/api/*`:
- `/api/auth/*` - Authentication endpoints
- `/api/user/*` - User management
- `/api/organizations/*` - Organization management
- `/api/projects/*` - Project management
- `/api/tasks/*` - Task management
- `/api/timelogs/*` - Time tracking
- `/api/stripe/*` - Payment integration

## Future Versioning

### When to Create a New Version

Create a new API version (v2, v3, etc.) when making **breaking changes**:

- Removing or renaming fields in responses
- Changing field types
- Removing endpoints
- Changing authentication mechanisms
- Modifying request/response structures

### How to Add a New Version

1. **Create new route file**: `server/routes/v2.ts`
2. **Mount new version**: Add to `server/index.ts`:
   ```typescript
   app.use('/api/v2', v2Router);
   ```
3. **Update version header**: Set `X-API-Version: v2` for v2 routes
4. **Maintain v1**: Keep v1 routes running for backward compatibility
5. **Document changes**: Update this file with migration guide

### Backward Compatibility

- **Current**: All routes at `/api/*` are version 1
- **Future**: When v2 is added, v1 routes remain at `/api/*` and `/api/v1/*`
- **Clients**: Can specify version in URL or use default (latest stable)

### Deprecation Policy

1. **Announce**: Notify clients 6 months before deprecation
2. **Warning**: Add deprecation warnings to responses
3. **Sunset**: Remove old version after deprecation period

## Migration Guide

### For Frontend Developers

When a new API version is released:

1. Review changelog for breaking changes
2. Update API calls to use new version: `/api/v2/*`
3. Test thoroughly before deploying
4. Update error handling for new response formats

### Example Migration

```typescript
// Old (v1)
const response = await fetch('/api/tasks');

// New (v2) - when v2 is released
const response = await fetch('/api/v2/tasks');
```

## Version History

### v1 (Current)
- Initial API version
- All current endpoints
- PostgreSQL session storage
- Rate limiting
- Input sanitization
- Security headers

### v2 (Planned)
- TBD based on future requirements
- Will be added when breaking changes are needed

## Best Practices

1. **Never break v1**: Keep v1 stable and backward compatible
2. **Version headers**: Always include `X-API-Version` in responses
3. **Documentation**: Document all changes in changelog
4. **Testing**: Test all versions independently
5. **Monitoring**: Track usage of each version to plan deprecations
