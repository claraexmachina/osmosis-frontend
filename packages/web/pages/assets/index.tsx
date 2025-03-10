import { PricePretty, RatePretty } from "@keplr-wallet/unit";
import { ObservableQueryPool } from "@osmosis-labs/stores";
import { observer } from "mobx-react-lite";
import type { NextPage } from "next";
import {
  ComponentProps,
  FunctionComponent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useTranslation } from "react-multi-lang";

import { ShowMoreButton } from "../../components/buttons/show-more";
import { PoolCard } from "../../components/cards/";
import { MetricLoader } from "../../components/loaders";
import { AssetsTable } from "../../components/table/assets-table";
import { DepoolingTable } from "../../components/table/depooling-table";
import { Metric } from "../../components/types";
import { EventName } from "../../config";
import {
  useAmplitudeAnalytics,
  useHideDustUserSetting,
  useNavBar,
  useTransferConfig,
  useWindowSize,
} from "../../hooks";
import {
  BridgeTransferModal,
  FiatRampsModal,
  IbcTransferModal,
  PreTransferModal,
  SelectAssetSourceModal,
  TransferAssetSelectModal,
  WalletConnectQRModal,
} from "../../modals";
import { useStore } from "../../stores";

const INIT_POOL_CARD_COUNT = 6;

const Assets: NextPage = observer(() => {
  const { isMobile } = useWindowSize();
  const { assetsStore } = useStore();
  const { nativeBalances, ibcBalances } = assetsStore;
  const t = useTranslation();

  const { setUserProperty, logEvent } = useAmplitudeAnalytics({
    onLoadEvent: [EventName.Assets.pageViewed],
  });
  const transferConfig = useTransferConfig();

  // mobile only
  const [preTransferModalProps, setPreTransferModalProps] =
    useState<ComponentProps<typeof PreTransferModal> | null>(null);
  const launchPreTransferModal = useCallback(
    (coinDenom: string) => {
      const ibcBalance = ibcBalances.find(
        (ibcBalance) => ibcBalance.balance.denom === coinDenom
      );

      if (!ibcBalance) {
        console.error("launchPreTransferModal: ibcBalance not found");
        return;
      }

      setPreTransferModalProps({
        isOpen: true,
        selectedToken: ibcBalance.balance,
        tokens: ibcBalances.map(({ balance }) => balance),
        externalDepositUrl: ibcBalance.depositUrlOverride,
        externalWithdrawUrl: ibcBalance.withdrawUrlOverride,
        isUnstable: ibcBalance.isUnstable,
        onSelectToken: launchPreTransferModal,
        onWithdraw: () => {
          transferConfig?.transferAsset(
            "withdraw",
            ibcBalance.chainInfo.chainId,
            coinDenom
          );
          setPreTransferModalProps(null);
        },
        onDeposit: () => {
          transferConfig?.transferAsset(
            "deposit",
            ibcBalance.chainInfo.chainId,
            coinDenom
          );
          setPreTransferModalProps(null);
        },
        onRequestClose: () => setPreTransferModalProps(null),
      });
    },
    [ibcBalances, transferConfig]
  );

  useEffect(() => {
    setUserProperty(
      "osmoBalance",
      Number(
        nativeBalances[0].balance.maxDecimals(6).hideDenom(true).toString()
      )
    );
  }, [nativeBalances[0].balance.maxDecimals(6).hideDenom(true).toString()]);

  // set nav bar ctas
  useNavBar({
    ctas: [
      {
        label: t("assets.table.depositButton"),
        onClick: () => {
          transferConfig?.startTransfer("deposit");
          logEvent([EventName.Assets.depositClicked]);
        },
      },
      {
        label: t("assets.table.withdrawButton"),
        onClick: () => {
          transferConfig?.startTransfer("withdraw");
          logEvent([EventName.Assets.withdrawClicked]);
        },
      },
    ],
  });

  const onTableDeposit = useCallback(
    (chainId, coinDenom, externalDepositUrl) => {
      if (!externalDepositUrl) {
        isMobile
          ? launchPreTransferModal(coinDenom)
          : transferConfig?.transferAsset("deposit", chainId, coinDenom);
      }
    },
    [isMobile, launchPreTransferModal, transferConfig?.transferAsset]
  );
  const onTableWithdraw = useCallback(
    (chainId, coinDenom, externalWithdrawUrl) => {
      if (!externalWithdrawUrl) {
        transferConfig?.transferAsset("withdraw", chainId, coinDenom);
      }
    },
    [transferConfig?.transferAsset]
  );

  return (
    <main className="mx-auto flex max-w-container flex-col gap-20 bg-osmoverse-900 p-8 pt-4 md:gap-8 md:p-4">
      <AssetsOverview />
      {isMobile && preTransferModalProps && (
        <PreTransferModal {...preTransferModalProps} />
      )}
      {transferConfig?.assetSelectModal && (
        <TransferAssetSelectModal {...transferConfig.assetSelectModal} />
      )}
      {transferConfig?.selectAssetSourceModal && (
        <SelectAssetSourceModal {...transferConfig.selectAssetSourceModal} />
      )}
      {transferConfig?.ibcTransferModal && (
        <IbcTransferModal {...transferConfig.ibcTransferModal} />
      )}
      {transferConfig?.bridgeTransferModal && (
        <BridgeTransferModal {...transferConfig.bridgeTransferModal} />
      )}
      {transferConfig?.fiatRampsModal && (
        <FiatRampsModal
          transakModalProps={{
            onCreateOrder: (data) => {
              logEvent([
                EventName.Assets.buyOsmoStarted,
                {
                  tokenName: data.status.cryptoCurrency,
                  tokenAmount: Number(
                    data.status?.fiatAmountInUsd ?? data.status.cryptoAmount
                  ),
                },
              ]);
            },
            onSuccessfulOrder: (data) => {
              logEvent([
                EventName.Assets.buyOsmoCompleted,
                {
                  tokenName: data.status.cryptoCurrency,
                  tokenAmount: Number(
                    data.status?.fiatAmountInUsd ?? data.status.cryptoAmount
                  ),
                },
              ]);
            },
          }}
          {...transferConfig.fiatRampsModal}
        />
      )}
      {transferConfig?.walletConnectEth.sessionConnectUri && (
        <WalletConnectQRModal
          isOpen={true}
          uri={transferConfig.walletConnectEth.sessionConnectUri || ""}
          onRequestClose={() => transferConfig.walletConnectEth.disable()}
        />
      )}
      <AssetsTable
        nativeBalances={nativeBalances}
        ibcBalances={ibcBalances}
        onDeposit={onTableDeposit}
        onWithdraw={onTableWithdraw}
      />
      {!isMobile && <PoolAssets />}
      <section className="bg-osmoverse-900">
        <DepoolingTable
          className="mx-auto max-w-container p-10 md:p-5"
          tableClassName="md:w-screen md:-mx-5"
        />
      </section>
    </main>
  );
});

const AssetsOverview: FunctionComponent = observer(() => {
  const { assetsStore } = useStore();
  const t = useTranslation();

  const totalAssetsValue = assetsStore.calcValueOf([
    ...assetsStore.availableBalance,
    ...assetsStore.lockedCoins,
    assetsStore.stakedBalance,
    assetsStore.unstakingBalance,
  ]);
  const availableAssetsValue = assetsStore.calcValueOf(
    assetsStore.availableBalance
  );
  const bondedAssetsValue = assetsStore.calcValueOf(assetsStore.lockedCoins);
  const stakedAssetsValue = assetsStore.calcValueOf([
    assetsStore.stakedBalance,
    assetsStore.unstakingBalance,
  ]);

  // set up user analytics
  const { setUserProperty } = useAmplitudeAnalytics();
  useEffect(() => {
    setUserProperty(
      "totalAssetsPrice",
      Number(totalAssetsValue.trim(true).toDec().toString(2))
    );
    setUserProperty(
      "unbondedAssetsPrice",
      Number(availableAssetsValue.trim(true).toDec().toString(2))
    );
    setUserProperty(
      "bondedAssetsPrice",
      Number(bondedAssetsValue.trim(true).toDec().toString(2))
    );
    setUserProperty(
      "stakedOsmoPrice",
      Number(stakedAssetsValue.trim(true).toDec().toString(2))
    );
  }, [
    totalAssetsValue.toString(),
    availableAssetsValue.toString(),
    bondedAssetsValue.toString(),
    stakedAssetsValue.toString(),
  ]);

  return (
    <div className="flex w-full items-center gap-[100px] rounded-[32px] bg-osmoverse-1000 px-8 py-9 lg:gap-5 lg:px-10 md:flex-col md:items-start md:gap-3 md:px-4 md:py-5">
      <Metric
        label={t("assets.totalAssets")}
        value={totalAssetsValue.toString()}
      />
      <Metric
        label={t("assets.bondedAssets")}
        value={bondedAssetsValue.toString()}
      />
      <Metric
        label={t("assets.unbondedAssets")}
        value={availableAssetsValue.toString()}
      />
      <Metric
        label={t("assets.stakedAssets")}
        value={stakedAssetsValue.toString()}
      />
    </div>
  );
});

const Metric: FunctionComponent<Metric> = ({ label, value }) => (
  <div className="flex shrink-0 flex-col gap-1 md:gap-2">
    <h6 className="md:text-subtitle1 md:font-subtitle1">{label}</h6>
    <h2 className="text-h3 font-h3 text-wosmongton-100 md:text-h4 md:font-h4">
      {value}
    </h2>
  </div>
);

const PoolAssets: FunctionComponent = observer(() => {
  const { chainStore, accountStore, queriesStore, priceStore } = useStore();
  const { setUserProperty } = useAmplitudeAnalytics();
  const t = useTranslation();

  const { chainId } = chainStore.osmosis;
  const { bech32Address } = accountStore.getAccount(chainId);
  const queryOsmosis = queriesStore.get(chainId).osmosis!;

  const ownedPoolIds = queriesStore
    .get(chainId)
    .osmosis!.queryGammPoolShare.getOwnPools(bech32Address);
  const [showAllPools, setShowAllPools] = useState(false);

  useEffect(() => {
    setUserProperty("myPoolsCount", ownedPoolIds.length);
  }, [ownedPoolIds.length]);

  const dustedPoolIds = useHideDustUserSetting(ownedPoolIds, (poolId) =>
    queryOsmosis.queryGammPools
      .getPool(poolId)
      ?.computeTotalValueLocked(priceStore)
      .mul(
        queryOsmosis.queryGammPoolShare.getAllGammShareRatio(
          bech32Address,
          poolId
        )
      )
  );

  if (dustedPoolIds.length === 0) {
    return null;
  }

  return (
    <section>
      <h5>{t("assets.myPools")}</h5>
      <PoolCards
        {...{ showAllPools, ownedPoolIds: dustedPoolIds, setShowAllPools }}
      />
    </section>
  );
});

const PoolCards: FunctionComponent<{
  showAllPools: boolean;
  ownedPoolIds: string[];
  setShowAllPools: (show: boolean) => void;
}> = observer(({ showAllPools, ownedPoolIds, setShowAllPools }) => {
  const { logEvent } = useAmplitudeAnalytics();
  return (
    <>
      <div className="grid-cards my-5 grid">
        <PoolCardsDisplayer
          poolIds={
            showAllPools
              ? ownedPoolIds
              : ownedPoolIds.slice(0, INIT_POOL_CARD_COUNT)
          }
        />
      </div>
      {ownedPoolIds.length > INIT_POOL_CARD_COUNT && (
        <ShowMoreButton
          className="m-auto"
          isOn={showAllPools}
          onToggle={() => {
            logEvent([
              EventName.Assets.assetsListMoreClicked,
              {
                isOn: !showAllPools,
              },
            ]);
            setShowAllPools(!showAllPools);
          }}
        />
      )}
    </>
  );
});

const PoolCardsDisplayer: FunctionComponent<{ poolIds: string[] }> = observer(
  ({ poolIds }) => {
    const { chainStore, queriesStore, derivedDataStore } = useStore();
    const t = useTranslation();

    const queryOsmosis = queriesStore.get(chainStore.osmosis.chainId).osmosis!;

    const pools = poolIds
      .map((poolId) => {
        const poolDetail = derivedDataStore.poolDetails.get(poolId);
        const poolBonding = derivedDataStore.poolsBonding.get(poolId);
        const pool = poolDetail.pool;

        const apr =
          poolBonding.highestBondDuration?.aggregateApr ?? new RatePretty(0);

        if (!pool) {
          return undefined;
        }

        return [
          pool,
          poolDetail.userShareValue,
          [
            queryOsmosis.queryIncentivizedPools.isIncentivized(poolId)
              ? {
                  label: t("assets.poolCards.APR"),
                  value: (
                    <MetricLoader
                      isLoading={
                        queryOsmosis.queryIncentivizedPools.isAprFetching
                      }
                    >
                      <h6>{apr.maxDecimals(2).toString()}</h6>
                    </MetricLoader>
                  ),
                }
              : {
                  label: t("assets.poolCards.FeeAPY"),
                  value:
                    poolBonding.highestBondDuration?.swapFeeApr
                      .maxDecimals(2)
                      .toString() ?? new RatePretty(0).toString(),
                },
            {
              label: t("assets.poolCards.liquidity"),
              value: poolDetail.userAvailableValue.maxDecimals(2).toString(),
            },
            queryOsmosis.queryIncentivizedPools.isIncentivized(poolId)
              ? {
                  label: t("assets.poolCards.bonded"),
                  value: poolDetail.userBondedValue.toString(),
                }
              : {
                  label: t("assets.poolCards.myLiquidity"),
                  value: poolDetail.userAvailableValue
                    .add(poolDetail.userBondedValue)
                    .toString(),
                },
          ],
        ] as [ObservableQueryPool, PricePretty, Metric[]];
      })
      .filter(
        (p): p is [ObservableQueryPool, PricePretty, Metric[]] =>
          p !== undefined
      )
      .sort(([, aFiatValue], [, bFiatValue]) => {
        // desc by fiat value
        if (aFiatValue.toDec().gt(bFiatValue.toDec())) return -1;
        if (aFiatValue.toDec().lt(bFiatValue.toDec())) return 1;
        return 0;
      });
    const { logEvent } = useAmplitudeAnalytics();

    return (
      <>
        {pools.map(([pool, _, metrics]) => (
          <PoolCard
            key={pool.id}
            poolId={pool.id}
            poolAssets={pool.poolAssets.map((asset) => asset.amount.currency)}
            poolMetrics={metrics}
            isSuperfluid={queryOsmosis.querySuperfluidPools.isSuperfluidPool(
              pool.id
            )}
            onClick={() =>
              logEvent([
                EventName.Assets.myPoolsCardClicked,
                {
                  poolId: pool.id,
                  poolName: pool.poolAssets
                    .map((poolAsset) => poolAsset.amount.denom)
                    .join(" / "),
                  poolWeight: pool.weightedPoolInfo?.assets
                    .map((poolAsset) => poolAsset.weightFraction?.toString())
                    .join(" / "),
                  isSuperfluidPool:
                    queryOsmosis.querySuperfluidPools.isSuperfluidPool(pool.id),
                },
              ])
            }
          />
        ))}
      </>
    );
  }
);

export default Assets;
