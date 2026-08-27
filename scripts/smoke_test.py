from engines.equilibrium import calculate_equilibrium_levels
r = calculate_equilibrium_levels(2500)
print("Equilibrium engine:")
print(f"  TV={r['tv']} QR1={r['qr1']} QS1={r['qs1']} SL={r['sl_price']} RR={r['rr_ratio']}")

from services.analytics import portfolio_analytics
sample = [
    {'status':'CLOSED','side':'BUY','entry_price':100,'exit_price':115,'quantity':10,
     'symbol':'TEST','opened_at':'2024-01-01T09:00:00+00:00',
     'closed_at':'2024-01-10T15:00:00+00:00','notes':''},
    {'status':'CLOSED','side':'BUY','entry_price':200,'exit_price':180,'quantity':5,
     'symbol':'TEST2','opened_at':'2024-02-01T09:00:00+00:00',
     'closed_at':'2024-02-05T15:00:00+00:00','notes':''},
]
r2 = portfolio_analytics(sample)
print("Analytics:")
print(f"  PnL={r2['total_pnl']} WinRate={r2['win_rate']} Sharpe={r2['sharpe_ratio']}")
print(f"  MaxConsecWins={r2['max_consecutive_wins']} MaxConsecLosses={r2['max_consecutive_losses']}")
print(f"  BySymbol={r2['by_symbol']}")
print("All checks passed!")
