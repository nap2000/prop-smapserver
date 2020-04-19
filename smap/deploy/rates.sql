-- 
-- Add rating information for billing
--
insert into bill_rates (o_id, e_id, rates, currency, created_by, ts_created, ts_applies_from) 
values (0, 
	0, 
	'[
		{"item": "1", "name": "submissions", "unitCost":"0.01", "free":"100"},
		{"item": "2", "name": "disk", "unitCost":"0.25", "free":"20"},
		{"item": "3", "name": "rekognition", "unitCost":"0.02", "free":"100"},
		{"item": "6", "name": "translate", "unitCost":"0.01", "free":"5000"},
		{"item": "7", "name": "transcribe", "unitCost":"0.01", "free":"2"},
		{"item": "4", "name": "static_map", "unitCost":"0", "free":"0"},
		{"item": "5", "name": "monthly", "unitCost":"50", "free":"0"}
	]',
	'USD',
	'system',
	now(),
	'2020-04-02');
	
insert into bill_rates (o_id, e_id, rates, currency, created_by, ts_created, ts_applies_from) 
values (0, 
	0, 
	'[
		{"item": "1", "name": "submissions", "unitCost":"0.01", "free":"100"},
		{"item": "2", "name": "disk", "unitCost":"0.25", "free":"20"},
		{"item": "3", "name": "rekognition", "unitCost":"0.02", "free":"100"},
		{"item": "4", "name": "static_map", "unitCost":"0", "free":"0"},
		{"item": "5", "name": "monthly", "unitCost":"50", "free":"0"}
	]',
	'USD',
	'system',
	now(),
	'2000-01-01');
	
insert into bill_rates (o_id, e_id, rates, currency, created_by, ts_created, ts_applies_from) 
values (0, 
	0, 
	'[
		{"item": "1", "name": "submissions", "unitCost":"0.01", "free":"100"},
		{"item": "2", "name": "disk", "unitCost":"0.25", "free":"100"},
		{"item": "3", "name": "rekognition", "unitCost":"0.02", "free":"100"},
		{"item": "4", "name": "static_map", "unitCost":"0", "free":"0"},
		{"item": "5", "name": "monthly", "unitCost":"245", "free":"0"}
	]',
	'USD',
	'system',
	now(),
	'2019-12-01');