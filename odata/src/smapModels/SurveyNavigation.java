package smapModels;

public class SurveyNavigation {
	
	public String ONE_TO_MANY = "one_to_many";
	public String MANY_TO_ONE = "many_to_one";
	
	public String name;
	public String navType;
	public boolean nullable = true;
	SurveyForm targetForm;
	
	public boolean isOneToMany() {
		return navType.equals(ONE_TO_MANY);
	}
}
