import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { billingService } from '../../services/billingService';
import type { BillingTransaction } from '../../services/billingService';
import { COLORS, SIZES } from '../../constants/theme';
import { formatNumber } from '../../utils/helpers';

export default function BillingScreen() {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch billing stats
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['billing-stats'],
    queryFn: () => billingService.getStats(),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleBuyCredits = () => {
    Alert.alert('Buy Credits', 'Credit purchase coming soon');
  };

  const CreditPackage = ({
    credits,
    price,
    recommended,
  }: {
    credits: number;
    price: number;
    recommended?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.packageCard, recommended && styles.recommendedCard]}
      activeOpacity={0.7}
      onPress={handleBuyCredits}
    >
      {recommended && (
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedText}>RECOMMENDED</Text>
        </View>
      )}
      <Text style={styles.packageCredits}>{formatNumber(credits)}</Text>
      <Text style={styles.packageLabel}>Credits</Text>
      <View style={styles.priceContainer}>
        <Text style={styles.packagePrice}>${price}</Text>
        <Text style={styles.perCredit}>
          ${(price / credits).toFixed(3)}/credit
        </Text>
      </View>
      <TouchableOpacity style={styles.selectButton} onPress={handleBuyCredits}>
        <Text style={styles.selectButtonText}>Select</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const TransactionRow = ({ transaction }: { transaction: BillingTransaction }) => {
    const isCredit = transaction.type === 'purchase' || transaction.type === 'bonus';
    const date = new Date(transaction.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <View style={styles.transactionRow}>
        <View style={styles.transactionLeft}>
          <View
            style={[
              styles.transactionIcon,
              { backgroundColor: isCredit ? `${COLORS.success}15` : `${COLORS.error}15` },
            ]}
          >
            <Ionicons
              name={isCredit ? 'add-circle' : 'remove-circle'}
              size={24}
              color={isCredit ? COLORS.success : COLORS.error}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.transactionType}>{transaction.description}</Text>
            <Text style={styles.transactionDate}>{date}</Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              { color: isCredit ? COLORS.success : COLORS.error },
            ]}
          >
            {isCredit ? '+' : ''}
            {formatNumber(transaction.amount)}
          </Text>
          <Text style={styles.transactionBalance}>
            Balance: {formatNumber(transaction.balance_after)}
          </Text>
        </View>
      </View>
    );
  };

  const StatCard = ({
    icon,
    label,
    value,
    color,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    color: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading billing information...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      <View style={styles.content}>
        {/* Current Balance */}
        <View style={styles.balanceCard}>
          <Ionicons name="wallet" size={32} color={COLORS.primary} />
          <Text style={styles.balanceLabel}>Available Credits</Text>
          <Text style={styles.balanceValue}>
            {formatNumber(stats?.currentBalance || user?.credits || 0)}
          </Text>
          <TouchableOpacity style={styles.buyButton} onPress={handleBuyCredits}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.buyButtonText}>Buy Credits</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        {stats && (
          <View style={styles.statsGrid}>
            <StatCard
              icon="trending-up"
              label="Total Purchased"
              value={formatNumber(stats.totalPurchased)}
              color={COLORS.success}
            />
            <StatCard
              icon="trending-down"
              label="Total Used"
              value={formatNumber(stats.totalUsed)}
              color={COLORS.error}
            />
            <StatCard
              icon="gift-outline"
              label="Bonus Credits"
              value={formatNumber(stats.totalBonus)}
              color={COLORS.warning}
            />
            <StatCard
              icon="calculator-outline"
              label="Avg Call Cost"
              value={`${stats.averageCallCost.toFixed(2)} credits`}
              color={COLORS.info}
            />
          </View>
        )}

        {/* Credit Packages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credit Packages</Text>
          <View style={styles.packagesGrid}>
            <CreditPackage credits={100} price={10} />
            <CreditPackage credits={500} price={45} recommended />
            <CreditPackage credits={1000} price={80} />
            <CreditPackage credits={5000} price={350} />
          </View>
        </View>

        {/* How Credits Work */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Credits Work</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.infoText}>
                1 credit = 1 minute of AI calling
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.infoText}>
                Credits never expire
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.infoText}>
                Pay only for what you use
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.infoText}>
                Volume discounts available
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <View style={styles.transactionsCard}>
            {stats && stats.recentTransactions.length > 0 ? (
              stats.recentTransactions.slice(0, 10).map((transaction, index) => (
                <React.Fragment key={transaction.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <TransactionRow transaction={transaction} />
                </React.Fragment>
              ))
            ) : (
              <View style={styles.emptyTransactions}>
                <Ionicons name="receipt-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.paddingMD,
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  content: {
    padding: SIZES.paddingLG,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SIZES.paddingXL,
    alignItems: 'center',
    marginBottom: SIZES.paddingXL,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  balanceLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SIZES.paddingSM,
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginVertical: SIZES.paddingSM,
  },
  buyButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.paddingXL,
    paddingVertical: SIZES.paddingMD,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    marginTop: SIZES.paddingMD,
  },
  buyButtonText: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.paddingMD,
    marginBottom: SIZES.paddingXL,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SIZES.paddingMD,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
  },
  statLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: SIZES.paddingXL,
  },
  sectionTitle: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SIZES.paddingMD,
  },
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.paddingMD,
  },
  packageCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SIZES.paddingMD,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recommendedCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  packageCredits: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  packageLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: SIZES.paddingMD,
  },
  packagePrice: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  perCredit: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
  },
  selectButton: {
    width: '100%',
    backgroundColor: `${COLORS.primary}15`,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SIZES.paddingMD,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SIZES.paddingSM,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.text,
  },
  transactionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SIZES.paddingMD,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionType: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  transactionDate: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  transactionBalance: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyTransactions: {
    padding: SIZES.paddingXL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: SIZES.paddingMD,
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
});
