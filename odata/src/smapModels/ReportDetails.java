package smapModels;

import java.util.ArrayList;
import java.util.HashMap;

import org.smap.sdal.model.OptionDesc;
import org.smap.sdal.model.SqlDesc;

public class ReportDetails {
	public String entitySetName;
	public SqlDesc sqlDesc;
	public HashMap<ArrayList<OptionDesc>, String> labelListMap = new  HashMap<> ();
}
