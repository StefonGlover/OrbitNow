type CardRefreshButtonProps = {
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
  label?: string;
  loadingLabel?: string;
};

export function CardRefreshButton({
  onRefresh,
  isLoading = false,
  label = "Refresh",
  loadingLabel = "Refreshing...",
}: CardRefreshButtonProps) {
  return (
    <button
      className="ui-btn-secondary"
      disabled={isLoading}
      onClick={() => void onRefresh()}
      type="button"
    >
      {isLoading ? loadingLabel : label}
    </button>
  );
}
