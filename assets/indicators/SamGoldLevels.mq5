//+------------------------------------------------------------------+
//|                                                SamGoldLevels.mq5 |
//|                                                      SAMBANGGOLD |
//|  Daily bias, the levels that matter and the three session boxes  |
//|  on one chart. Licensed to your MT5 account through the site.    |
//+------------------------------------------------------------------+
#property copyright "SAMBANGGOLD"
#property link      "https://sambanggold.com"
#property version   "1.00"
#property indicator_chart_window
#property indicator_plots 0

// Same rule every day, so the bias is never a matter of mood:
//   BUY  when price is above the previous day midpoint AND above today's open.
//   SELL when price is below both.
//   WAIT otherwise.

input string InpApiBase   = "https://sambanggold.com"; // Site address
input string InpKey       = "";                        // Licence key (from your account page)
input bool   InpShowPD    = true;   // Previous day high, low, midpoint
input bool   InpShowOpen  = true;   // Today's open
input bool   InpShowPW    = true;   // Previous week high and low
input bool   InpShowAsia  = true;   // Asia range
input bool   InpShowBoxes = true;   // Session boxes
input int    InpBoxDays   = 5;      // Days of boxes to keep
input int    InpTzOffset  = 8;      // Session clock, hours from UTC (8 = Malaysia)
input string InpAsia      = "07:00-15:00"; // Asia
input string InpLondon    = "15:00-23:00"; // London
input string InpNewYork   = "20:30-04:00"; // New York
input color  InpGold      = C'212,175,55';
input color  InpChrome    = C'183,192,206';
input color  InpBuy       = C'31,157,85';
input color  InpSell      = C'214,69,69';

#define PFX "sbg_lv_"

bool     g_licensed  = false;
string   g_status    = "starting";
datetime g_lastCheck = 0;
string   g_account   = "";

//+------------------------------------------------------------------+
//| Licence                                                          |
//+------------------------------------------------------------------+
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

bool JsonBool(const string src, const string key)
  {
   string pat = "\"" + key + "\":";
   int p = StringFind(src, pat);
   if(p < 0) return false;
   return StringSubstr(src, p + StringLen(pat), 4) == "true";
  }

// One call to the site. Binds this account to the key on first use, then confirms it after.
bool CheckLicense()
  {
   if(StringLen(InpKey) < 8) { g_status = "paste your licence key from the account page"; return false; }
   string url = InpApiBase + "/api/license/check";
   string payload = "{\"license\":\"" + InpKey + "\",\"account\":\"" + g_account + "\"}";
   char post[], result[];
   StringToCharArray(payload, post, 0, StringLen(payload), CP_UTF8);
   string headers = "Content-Type: application/json\r\n", resultHeaders;
   ResetLastError();
   int code = WebRequest("POST", url, headers, 10000, post, result, resultHeaders);
   if(code == -1)
     {
      int err = GetLastError();
      g_status = (err == 4014) ? "Add " + InpApiBase + " under Tools > Options > Expert Advisors" : "Network error " + IntegerToString(err);
      Print("[levels] ", g_status);
      return false;
     }
   string body = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   if(!JsonBool(body, "ok"))
     {
      string msg = JsonStr(body, "error");
      g_status = "Licence: " + (msg == "" ? "refused (" + IntegerToString(code) + ")" : msg);
      Print("[levels] ", g_status);
      return false;
     }
   g_status = "licensed";
   return true;
  }

//+------------------------------------------------------------------+
//| Drawing helpers                                                  |
//+------------------------------------------------------------------+
void HLine(const string name, const double price, const datetime from, const color clr, const int style, const int width, const string text)
  {
   string id = PFX + name;
   if(ObjectFind(0, id) < 0)
     {
      ObjectCreate(0, id, OBJ_TREND, 0, from, price, TimeCurrent() + 3600, price);
      ObjectSetInteger(0, id, OBJPROP_RAY_RIGHT, true);
      ObjectSetInteger(0, id, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, id, OBJPROP_BACK, true);
     }
   ObjectSetInteger(0, id, OBJPROP_TIME, 0, from);
   ObjectSetDouble(0, id, OBJPROP_PRICE, 0, price);
   ObjectSetInteger(0, id, OBJPROP_TIME, 1, TimeCurrent() + 3600);
   ObjectSetDouble(0, id, OBJPROP_PRICE, 1, price);
   ObjectSetInteger(0, id, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, id, OBJPROP_STYLE, style);
   ObjectSetInteger(0, id, OBJPROP_WIDTH, width);

   string lid = id + "_lbl";
   if(ObjectFind(0, lid) < 0)
     {
      ObjectCreate(0, lid, OBJ_TEXT, 0, TimeCurrent(), price);
      ObjectSetInteger(0, lid, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, lid, OBJPROP_ANCHOR, ANCHOR_LEFT_LOWER);
      ObjectSetInteger(0, lid, OBJPROP_FONTSIZE, 8);
     }
   ObjectSetInteger(0, lid, OBJPROP_TIME, 0, TimeCurrent() + PeriodSeconds() * 2);
   ObjectSetDouble(0, lid, OBJPROP_PRICE, 0, price);
   ObjectSetInteger(0, lid, OBJPROP_COLOR, clr);
   ObjectSetString(0, lid, OBJPROP_TEXT, text + "  " + DoubleToString(price, _Digits));
  }

void Box(const string name, const datetime t1, const datetime t2, const double hi, const double lo, const color clr, const string text)
  {
   string id = PFX + name;
   if(ObjectFind(0, id) < 0)
     {
      ObjectCreate(0, id, OBJ_RECTANGLE, 0, t1, hi, t2, lo);
      ObjectSetInteger(0, id, OBJPROP_FILL, true);
      ObjectSetInteger(0, id, OBJPROP_BACK, true);
      ObjectSetInteger(0, id, OBJPROP_SELECTABLE, false);
     }
   ObjectSetInteger(0, id, OBJPROP_TIME, 0, t1);
   ObjectSetDouble(0, id, OBJPROP_PRICE, 0, hi);
   ObjectSetInteger(0, id, OBJPROP_TIME, 1, t2);
   ObjectSetDouble(0, id, OBJPROP_PRICE, 1, lo);
   ObjectSetInteger(0, id, OBJPROP_COLOR, clr);
   string lid = id + "_lbl";
   if(ObjectFind(0, lid) < 0)
     {
      ObjectCreate(0, lid, OBJ_TEXT, 0, t1, hi);
      ObjectSetInteger(0, lid, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, lid, OBJPROP_ANCHOR, ANCHOR_LEFT_LOWER);
      ObjectSetInteger(0, lid, OBJPROP_FONTSIZE, 7);
      ObjectSetInteger(0, lid, OBJPROP_COLOR, InpChrome);
     }
   ObjectSetInteger(0, lid, OBJPROP_TIME, 0, t1);
   ObjectSetDouble(0, lid, OBJPROP_PRICE, 0, hi);
   ObjectSetString(0, lid, OBJPROP_TEXT, text);
  }

void Panel(const string bias, const color biasClr, const string line2)
  {
   string ids[3] = {PFX "p0", PFX "p1", PFX "p2"};
   string txt[3] = {"SAMBANGGOLD  " + _Symbol, "Bias  " + bias, line2};
   color  clr[3] = {InpGold, biasClr, InpChrome};
   for(int i = 0; i < 3; i++)
     {
      if(ObjectFind(0, ids[i]) < 0)
        {
         ObjectCreate(0, ids[i], OBJ_LABEL, 0, 0, 0);
         ObjectSetInteger(0, ids[i], OBJPROP_CORNER, CORNER_RIGHT_UPPER);
         ObjectSetInteger(0, ids[i], OBJPROP_ANCHOR, ANCHOR_RIGHT_UPPER);
         ObjectSetInteger(0, ids[i], OBJPROP_XDISTANCE, 12);
         ObjectSetInteger(0, ids[i], OBJPROP_YDISTANCE, 12 + i * 18);
         ObjectSetInteger(0, ids[i], OBJPROP_FONTSIZE, i == 1 ? 11 : 9);
         ObjectSetString(0, ids[i], OBJPROP_FONT, "Arial");
         ObjectSetInteger(0, ids[i], OBJPROP_SELECTABLE, false);
        }
      ObjectSetString(0, ids[i], OBJPROP_TEXT, txt[i]);
      ObjectSetInteger(0, ids[i], OBJPROP_COLOR, clr[i]);
     }
  }

// Session window on a given local day: "HH:MM-HH:MM" in the session clock, returned as server time.
bool SessionWindow(const string spec, const datetime localDay, datetime &from, datetime &to)
  {
   string parts[];
   if(StringSplit(spec, '-', parts) != 2) return false;
   string a[], b[];
   if(StringSplit(parts[0], ':', a) != 2 || StringSplit(parts[1], ':', b) != 2) return false;
   int sh = (int)StringToInteger(a[0]), sm = (int)StringToInteger(a[1]);
   int eh = (int)StringToInteger(b[0]), em = (int)StringToInteger(b[1]);
   // Server clock relative to UTC, so local session times land on the right server bars.
   int serverOffset = (int)((TimeCurrent() - TimeGMT()) / 3600);
   int shift = (serverOffset - InpTzOffset) * 3600;
   from = localDay + sh * 3600 + sm * 60 + shift;
   to   = localDay + eh * 3600 + em * 60 + shift;
   if(to <= from) to += 86400;
   return true;
  }

// High and low of the bars inside [from, to) on the chart timeframe.
bool RangeOf(const datetime from, const datetime to, double &hi, double &lo)
  {
   int start = iBarShift(_Symbol, _Period, from, false);
   int end   = iBarShift(_Symbol, _Period, to - 1, false);
   if(start < 0 || end < 0 || start < end) return false;
   hi = -1; lo = -1;
   for(int i = end; i <= start; i++)
     {
      datetime t = iTime(_Symbol, _Period, i);
      if(t < from || t >= to) continue;
      double h = iHigh(_Symbol, _Period, i), l = iLow(_Symbol, _Period, i);
      if(hi < 0 || h > hi) hi = h;
      if(lo < 0 || l < lo) lo = l;
     }
   return hi > 0;
  }

//+------------------------------------------------------------------+
//| Main draw                                                        |
//+------------------------------------------------------------------+
void Draw()
  {
   double pdH = iHigh(_Symbol, PERIOD_D1, 1), pdL = iLow(_Symbol, PERIOD_D1, 1);
   double dOpen = iOpen(_Symbol, PERIOD_D1, 0);
   datetime dStart = iTime(_Symbol, PERIOD_D1, 0);
   double pwH = iHigh(_Symbol, PERIOD_W1, 1), pwL = iLow(_Symbol, PERIOD_W1, 1);
   double pdMid = (pdH + pdL) / 2;
   double px = SymbolInfoDouble(_Symbol, SYMBOL_BID);

   if(InpShowPD)
     {
      HLine("pdh", pdH,   dStart, InpChrome, STYLE_SOLID, 1, "PDH");
      HLine("pdl", pdL,   dStart, InpChrome, STYLE_SOLID, 1, "PDL");
      HLine("pdm", pdMid, dStart, InpChrome, STYLE_DOT,   1, "PD mid");
     }
   if(InpShowOpen) HLine("open", dOpen, dStart, InpGold, STYLE_DASH, 1, "Open");
   if(InpShowPW)
     {
      HLine("pwh", pwH, dStart, InpGold, STYLE_SOLID, 2, "PWH");
      HLine("pwl", pwL, dStart, InpGold, STYLE_SOLID, 2, "PWL");
     }

   // Session boxes for the last N local days, plus the Asia range of today.
   int serverOffset = (int)((TimeCurrent() - TimeGMT()) / 3600);
   datetime nowLocal = TimeCurrent() - serverOffset * 3600 + InpTzOffset * 3600;
   datetime localDay = nowLocal - (nowLocal % 86400);
   string names[3] = {"asia", "lon", "ny"};
   string specs[3] = {InpAsia, InpLondon, InpNewYork};
   string labels[3] = {"Asia", "London", "New York"};
   color  cols[3] = {C'32,36,44', C'52,44,20', C'40,24,10'};
   for(int d = 0; d < InpBoxDays; d++)
     {
      datetime day = localDay - d * 86400;
      for(int s = 0; s < 3; s++)
        {
         datetime from, to; double hi, lo;
         if(!SessionWindow(specs[s], day, from, to)) continue;
         if(from > TimeCurrent()) continue;
         datetime upto = MathMin(to, TimeCurrent() + PeriodSeconds());
         if(!RangeOf(from, upto, hi, lo)) continue;
         if(InpShowBoxes) Box(names[s] + IntegerToString(d), from, upto, hi, lo, cols[s], labels[s]);
         if(s == 0 && d == 0 && InpShowAsia)
           {
            HLine("ash", hi, from, InpChrome, STYLE_DOT, 1, "Asia H");
            HLine("asl", lo, from, InpChrome, STYLE_DOT, 1, "Asia L");
           }
        }
     }

   bool bull = px > pdMid && px > dOpen, bear = px < pdMid && px < dOpen;
   string bias = bull ? "BUY" : bear ? "SELL" : "WAIT";
   color  bc   = bull ? InpBuy : bear ? InpSell : InpChrome;
   Panel(bias, bc, "PD range " + DoubleToString(pdH - pdL, _Digits) + "   from open " + DoubleToString(px - dOpen, _Digits));
  }

void Clear()
  {
   ObjectsDeleteAll(0, PFX);
  }

//+------------------------------------------------------------------+
int OnInit()
  {
   g_account  = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   g_licensed = CheckLicense();
   g_lastCheck = TimeCurrent();
   EventSetTimer(30);
   if(!g_licensed) Panel("LOCKED", InpSell, g_status);
   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
   Clear();
  }

int OnCalculate(const int rates_total, const int prev_calculated, const datetime &time[], const double &open[], const double &high[], const double &low[], const double &close[], const long &tick_volume[], const long &volume[], const int &spread[])
  {
   if(g_licensed) Draw();
   return rates_total;
  }

// Re-check the licence once a day so an expired subscription stops drawing; retry sooner while locked.
void OnTimer()
  {
   int every = g_licensed ? 86400 : 60;
   if(TimeCurrent() - g_lastCheck < every) return;
   g_lastCheck = TimeCurrent();
   bool was = g_licensed;
   g_licensed = CheckLicense();
   if(was && !g_licensed) { Clear(); Panel("LOCKED", InpSell, g_status); }
   if(!was && g_licensed) Draw();
   ChartRedraw();
  }
//+------------------------------------------------------------------+
