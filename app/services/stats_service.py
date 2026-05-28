class StatsService:
    @staticmethod
    def get_user_dashboard(user, user_store, usage_store):
        usage_stats = usage_store.get_user_stats(user.id)
        return {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "api_key_prefix": user.api_key_prefix,
                "tier": user.tier.value,
                "balance_tokens": user.balance_tokens,
                "is_admin": user.is_admin,
                "is_banned": user.is_banned,
                "created_at": user.created_at,
            },
            "usage": usage_stats,
        }

    @staticmethod
    def get_admin_dashboard(user_store, usage_store, tier_store):
        platform_stats = usage_store.get_platform_stats()
        users = user_store.list_all()
        tiers = tier_store.list_all()
        return {
            "stats": platform_stats,
            "total_users": len(users),
            "users": [{
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "api_key_prefix": u.api_key_prefix,
                "tier": u.tier.value,
                "balance_tokens": u.balance_tokens,
                "is_admin": u.is_admin,
                "is_banned": u.is_banned,
                "created_at": u.created_at,
            } for u in users],
            "tiers": tiers,
        }
