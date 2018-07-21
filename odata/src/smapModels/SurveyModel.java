package smapModels;

import java.util.ArrayList;
import java.util.HashMap;

import org.apache.olingo.commons.api.edm.FullQualifiedName;

public class SurveyModel {
	public int id;
	public String ident;
	public String name;
	ArrayList<SurveyForm> forms = new ArrayList<>();
}
