//+------------------------------------------------------------------+
//| SAMBANGGOLD Copier                                               |
//| Copies SAMBANGGOLD signals into this terminal.                   |
//|                                                                  |
//| Setup, once:                                                     |
//|  1. Copy this file to MQL5\Experts in your MT5 data folder.      |
//|  2. In MetaEditor press F7 to compile.                           |
//|  3. Tools > Options > Expert Advisors: tick "Allow WebRequest    |
//|     for listed URL" and add the site address.                    |
//|  4. Drag the robot onto an XAUUSD chart, paste your key,         |
//|     set your risk, press OK.                                     |
//|  5. Turn AutoTrading on.                                         |
//|                                                                  |
//| Education only. Trading carries risk. Test on a demo first.      |
//+------------------------------------------------------------------+
#property copyright "SAMBANGGOLD"
#property link      "https://websitesam-production.up.railway.app"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>

input string  InpApiBase      = "https://websitesam-production.up.railway.app"; // Site address
input string  InpKey          = "";        // Your copier key, from the dashboard
input bool    InpUseServerRisk = true;     // Take risk settings from the dashboard
input string  InpRiskMode     = "percent"; // fixed or percent, when not using the dashboard
input double  InpFixedLot     = 0.01;      // Lot when the mode is fixed
input double  InpRiskPercent  = 1.0;       // Percent of balance risked when the mode is percent
input double  InpMaxLot       = 1.0;       // Never exceed this lot
input int     InpExpiryMin    = 240;       // Cancel a pending order after this many minutes
input string  InpSymbolSuffix = "";        // Broker suffix, for example .m or _raw
input int     InpSlippage     = 30;        // Slippage in points for closes
input long    InpMagic        = 24071;     // Magic number for this robot's orders
input int     InpPollSeconds  = 15;        // Seconds between checks

CTrade   trade;
string   g_account   = "";
string   g_riskMode  = "percent";
double   g_fixedLot  = 0.01;
double   g_riskPct   = 1.0;
double   g_maxLot    = 1.0;
int      g_expiryMin = 240;
string   g_suffix    = "";
bool     g_enabled   = true;
bool     g_ready     = false;
string   g_status    = "starting";
datetime g_lastHello = 0;

//+------------------------------------------------------------------+
//| Small helpers                                                    |
//+------------------------------------------------------------------+

// Value of a JSON string field, for the flat objects this robot receives.
string JsonStr(const string src, const string key)
  {
   string pat = "\"" + key + "\":\"";
   int p = StringFind(src, pat);
   if(p < 0) return "";
   p += StringLen(pat);
   int e = StringFind(src, "\"", p);
   if(e < 0) return "";
   return StringSubstr(src, p, e - p);
  }

// Value of a JSON number or boolean field.
string JsonRaw(const string src, const string key)
  {
   string pat = "\"" + key + "\":";
   int p = StringFind(src, pat);
   if(p < 0) return "";
   p += StringLen(pat);
   int e = p;
   while(e < StringLen(src))
     {
      ushort c = StringGetCharacter(src, e);
      if(c == ',' || c == '}' || c == ']') break;
      e++;
     }
   string v = StringSubstr(src, p, e - p);
   StringTrimLeft(v); StringTrimRight(v);
   return v;
  }

double JsonNum(const string src, const string key, const double fallback)
  {
   string v = JsonRaw(src, key);
   if(v == "" || v == "null") return fallback;
   return StringToDouble(v);
  }

bool JsonBool(const string src, const string key, const bool fallback)
  {
   string v = JsonRaw(src, key);
   if(v == "true") return true;
   if(v == "false") return false;
   return fallback;
  }

// Split the "commands" array into one string per object. The objects are flat,
// so counting braces from the first one is enough.
int SplitCommands(const string body, string &out[])
  {
   ArrayResize(out, 0);
   int start = StringFind(body, "\"commands\":[");
   if(start < 0) return 0;
   start += StringLen("\"commands\":[");
   int depth = 0, from = -1, n = 0;
   for(int i = start; i < StringLen(body); i++)
     {
      ushort c = StringGetCharacter(body, i);
      if(c == '{') { if(depth == 0) from = i; depth++; }
      else if(c == '}')
        {
         depth--;
         if(depth == 0 && from >= 0)
           {
            n++; ArrayResize(out, n);
            out[n - 1] = StringSubstr(body, from, i - from + 1);
            from = -1;
           }
        }
      else if(c == ']' && depth == 0) break;
     }
   return n;
  }

// One HTTP call. Returns the body, or "" and a status line on failure.
string Http(const string method, const string url, const string payload)
  {
   char   post[], result[];
   string headers = "Content-Type: application/json\r\n";
   if(StringLen(payload) > 0) StringToCharArray(payload, post, 0, StringLen(payload), CP_UTF8);
   string resultHeaders;
   ResetLastError();
   int code = WebRequest(method, url, headers, 10000, post, result, resultHeaders);
   if(code == -1)
     {
      int err = GetLastError();
      if(err == 4014)
         g_status = "Add " + InpApiBase + " under Tools > Options > Expert Advisors";
      else
         g_status = "Network error " + IntegerToString(err);
      return "";
     }
   string body = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   if(code < 200 || code >= 300)
     {
      string msg = JsonStr(body, "error");
      g_status = "Server said " + IntegerToString(code) + (msg == "" ? "" : ": " + msg);
      return "";
     }
   return body;
  }

// The chart symbol for a signal instrument, with the broker's suffix.
string SymbolFor(const string instrument)
  {
   string s = instrument + g_suffix;
   if(SymbolSelect(s, true)) return s;
   if(SymbolSelect(instrument, true)) return instrument;
   return _Symbol;
  }

// Lot for this trade, from the stop distance when the mode is percent.
double LotFor(const string symbol, const double entry, const double sl)
  {
   double lot = g_fixedLot;
   if(g_riskMode == "percent")
     {
      double risk = AccountInfoDouble(ACCOUNT_BALANCE) * g_riskPct / 100.0;
      double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
      double tickSize  = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
      double distance  = MathAbs(entry - sl);
      if(tickValue > 0 && tickSize > 0 && distance > 0)
        {
         double lossPerLot = (distance / tickSize) * tickValue;
         if(lossPerLot > 0) lot = risk / lossPerLot;
        }
     }
   double minLot  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double stepLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
   if(stepLot > 0) lot = MathFloor(lot / stepLot) * stepLot;
   lot = MathMin(lot, g_maxLot);
   if(maxLot > 0) lot = MathMin(lot, maxLot);
   if(minLot > 0) lot = MathMax(lot, minLot);
   return NormalizeDouble(lot, 2);
  }

// Tell the site what happened, so the dashboard shows it.
void Ack(const string signal, const string action, const string status, const string ticket, const double lots, const double price, const string detail)
  {
   string payload = StringFormat(
      "{\"key\":\"%s\",\"account\":\"%s\",\"signal\":\"%s\",\"action\":\"%s\",\"status\":\"%s\",\"ticket\":\"%s\",\"lots\":%.2f,\"price\":%.3f,\"detail\":\"%s\"}",
      InpKey, g_account, signal, action, status, ticket, lots, price, detail);
   Http("POST", InpApiBase + "/api/copier/ack", payload);
  }

//+------------------------------------------------------------------+
//| Handshake: bind this terminal and read the member's settings     |
//+------------------------------------------------------------------+
bool Hello()
  {
   string payload = StringFormat("{\"key\":\"%s\",\"account\":\"%s\",\"broker\":\"%s\",\"currency\":\"%s\"}",
                                 InpKey, g_account, AccountInfoString(ACCOUNT_COMPANY), AccountInfoString(ACCOUNT_CURRENCY));
   string body = Http("POST", InpApiBase + "/api/copier/hello", payload);
   if(body == "") return false;
   if(!JsonBool(body, "ok", false)) { g_status = JsonStr(body, "error"); return false; }

   g_enabled = JsonBool(body, "enabled", true);
   if(InpUseServerRisk)
     {
      string mode = JsonStr(body, "risk_mode");
      if(mode != "") g_riskMode = mode;
      g_fixedLot  = JsonNum(body, "lot_fixed", g_fixedLot);
      g_riskPct   = JsonNum(body, "risk_percent", g_riskPct);
      g_maxLot    = JsonNum(body, "max_lot", g_maxLot);
      g_expiryMin = (int)JsonNum(body, "expiry_minutes", g_expiryMin);
      string suffix = JsonStr(body, "symbol_suffix");
      if(suffix != "") g_suffix = suffix;
     }
   g_lastHello = TimeCurrent();
   g_ready = true;
   g_status = g_enabled ? "connected" : "paused from the dashboard";
   return true;
  }

//+------------------------------------------------------------------+
//| Place one signal as a pending order at our entry                 |
//+------------------------------------------------------------------+
void OpenSignal(const string cmd)
  {
   string signal = JsonStr(cmd, "signal");
   string side   = JsonStr(cmd, "side");
   string symbol = SymbolFor(JsonStr(cmd, "symbol"));
   double entry  = JsonNum(cmd, "entry", 0);
   double sl     = JsonNum(cmd, "sl", 0);
   if(signal == "" || entry <= 0 || sl <= 0) return;

   // First target is the order's take profit; the rest are managed by hand.
   double tp = 0;
   int tpsAt = StringFind(cmd, "\"tps\":[");
   if(tpsAt >= 0)
     {
      string rest = StringSubstr(cmd, tpsAt + 7);
      int end = StringFind(rest, "]");
      if(end > 0)
        {
         string list = StringSubstr(rest, 0, end);
         string parts[];
         if(StringSplit(list, ',', parts) > 0) tp = StringToDouble(parts[0]);
        }
     }

   double lot = LotFor(symbol, entry, sl);
   if(lot <= 0) { Ack(signal, "open", "skipped", "", 0, entry, "lot came out zero"); return; }

   double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   entry = NormalizeDouble(entry, digits);
   sl    = NormalizeDouble(sl, digits);
   tp    = NormalizeDouble(tp, digits);
   datetime expiry = TimeCurrent() + g_expiryMin * 60;

   trade.SetExpertMagicNumber(InpMagic);
   trade.SetTypeFillingBySymbol(symbol);
   bool sent = false;
   string how = "";
   if(side == "buy")
     {
      if(entry < ask) { sent = trade.BuyLimit(lot, entry, symbol, sl, tp, ORDER_TIME_SPECIFIED, expiry, signal); how = "buy limit"; }
      else            { sent = trade.BuyStop(lot, entry, symbol, sl, tp, ORDER_TIME_SPECIFIED, expiry, signal);  how = "buy stop"; }
     }
   else
     {
      if(entry > bid) { sent = trade.SellLimit(lot, entry, symbol, sl, tp, ORDER_TIME_SPECIFIED, expiry, signal); how = "sell limit"; }
      else            { sent = trade.SellStop(lot, entry, symbol, sl, tp, ORDER_TIME_SPECIFIED, expiry, signal);  how = "sell stop"; }
     }

   if(sent)
     {
      Ack(signal, "open", "placed", IntegerToString(trade.ResultOrder()), lot, entry, how);
      PrintFormat("[copier] %s %s %.2f at %s", how, symbol, lot, DoubleToString(entry, digits));
     }
   else
     {
      Ack(signal, "open", "rejected", "", lot, entry, trade.ResultRetcodeDescription());
      PrintFormat("[copier] rejected: %s", trade.ResultRetcodeDescription());
     }
  }

//+------------------------------------------------------------------+
//| Close whatever this signal left open, and drop its pending order |
//+------------------------------------------------------------------+
void CloseSignal(const string cmd)
  {
   string signal = JsonStr(cmd, "signal");
   string reason = JsonStr(cmd, "reason");
   if(signal == "") return;
   int touched = 0;

   for(int i = OrdersTotal() - 1; i >= 0; i--)
     {
      ulong ticket = OrderGetTicket(i);
      if(ticket == 0) continue;
      if(OrderGetInteger(ORDER_MAGIC) != InpMagic) continue;
      if(OrderGetString(ORDER_COMMENT) != signal) continue;
      if(trade.OrderDelete(ticket)) touched++;
     }

   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      if(PositionGetString(POSITION_COMMENT) != signal) continue;
      trade.SetDeviationInPoints(InpSlippage);
      if(trade.PositionClose(ticket)) touched++;
     }

   Ack(signal, "close", "closed", "", 0, 0, reason + ", " + IntegerToString(touched) + " touched");
  }

//+------------------------------------------------------------------+
//| Poll and act                                                     |
//+------------------------------------------------------------------+
void Poll()
  {
   if(!g_ready && !Hello()) return;
   if(TimeCurrent() - g_lastHello > 300) Hello(); // refresh settings every five minutes

   string url = InpApiBase + "/api/copier/signals?key=" + InpKey + "&account=" + g_account;
   string body = Http("GET", url, "");
   if(body == "") { g_ready = false; return; }
   if(!JsonBool(body, "ok", false)) { g_status = JsonStr(body, "error"); g_ready = false; return; }
   if(JsonBool(body, "paused", false)) { g_status = "paused from the dashboard"; return; }

   g_status = "connected";
   string cmds[];
   int n = SplitCommands(body, cmds);
   for(int i = 0; i < n; i++)
     {
      string action = JsonStr(cmds[i], "action");
      if(action == "open")       OpenSignal(cmds[i]);
      else if(action == "close") CloseSignal(cmds[i]);
     }
  }

//+------------------------------------------------------------------+
//| Chart panel                                                      |
//+------------------------------------------------------------------+
void DrawPanel()
  {
   string name = "sbg_copier_status";
   if(ObjectFind(0, name) < 0)
     {
      ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetInteger(0, name, OBJPROP_XDISTANCE, 12);
      ObjectSetInteger(0, name, OBJPROP_YDISTANCE, 18);
      ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 9);
      ObjectSetString(0, name, OBJPROP_FONT, "Consolas");
     }
   bool good = (g_status == "connected");
   ObjectSetInteger(0, name, OBJPROP_COLOR, good ? clrGold : clrTomato);
   ObjectSetString(0, name, OBJPROP_TEXT, "SAMBANGGOLD copier: " + g_status +
                   "  |  " + g_riskMode + (g_riskMode == "percent" ? StringFormat(" %.2f%%", g_riskPct) : StringFormat(" %.2f lot", g_fixedLot)));
   ChartRedraw(0);
  }

//+------------------------------------------------------------------+
int OnInit()
  {
   g_account   = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   g_riskMode  = (InpRiskMode == "fixed") ? "fixed" : "percent";
   g_fixedLot  = InpFixedLot;
   g_riskPct   = InpRiskPercent;
   g_maxLot    = InpMaxLot;
   g_expiryMin = InpExpiryMin;
   g_suffix    = InpSymbolSuffix;

   if(StringLen(InpKey) < 8)
     {
      g_status = "paste your copier key from the dashboard";
      Print("[copier] no key set");
     }
   else if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED))
      g_status = "turn AutoTrading on";
   else
      Hello();

   EventSetTimer(MathMax(5, InpPollSeconds));
   DrawPanel();
   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
   ObjectDelete(0, "sbg_copier_status");
  }

void OnTimer()
  {
   if(StringLen(InpKey) >= 8 && TerminalInfoInteger(TERMINAL_TRADE_ALLOWED)) Poll();
   DrawPanel();
  }
//+------------------------------------------------------------------+
